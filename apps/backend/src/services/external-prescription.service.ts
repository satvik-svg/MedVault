import { Patient } from '../models/Patient.ts'
import { Prescription } from '../models/Prescription.ts'
import { aiClient } from './ai-client.service.ts'

function averageConfidence(medications: Array<Record<string, unknown>>): number {
  if (!medications.length) return 0
  const values = medications.map((medication) => {
    const confidence = medication.confidence
    if (typeof confidence === 'number') return confidence
    if (confidence && typeof confidence === 'object' && 'overall' in confidence) {
      return Number((confidence as { overall?: number }).overall || 0)
    }
    return 0
  })
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function mapExtractedMedication(medication: Record<string, unknown>) {
  const rawName = String(medication.drug_raw || medication.drug_name || medication.generic_name || 'Unverified medication')
  return {
    rxnormCui: String(medication.rxnorm_cui || `UNMAPPED:${rawName.toLowerCase().replace(/\s+/g, '-')}`),
    genericName: String(medication.generic_name || medication.drug_name || rawName),
    brandName: medication.matched_brand ? String(medication.matched_brand) : rawName,
    strength: medication.strength ? String(medication.strength) : undefined,
    form: undefined,
    route: medication.route === 'IV' ? 'IV' : 'ORAL',
    dosage: {
      frequency: typeof medication.frequency === 'string' ? medication.frequency : 'CUSTOM',
      duration: {
        value: Number(medication.duration_value || 1),
        unit: typeof medication.duration_unit === 'string' ? medication.duration_unit : 'DAYS',
      },
      customInstructions: medication.notes ? String(medication.notes) : undefined,
    },
    safetyChecks: {
      externalSource: true,
      checked: false,
      reason: 'External OCR prescriptions are stored as historical records and are not treated as MedVault-issued orders.',
    },
  }
}

export async function uploadExternalPrescription(input: {
  patientId: string
  uploadedByUserId: string
  imageBase64: string
  sourceImageUrl?: string
}): Promise<Record<string, unknown>> {
  const patient = await Patient.findById(input.patientId)
  if (!patient) throw new Error('Patient not found')

  const ocrResult = await aiClient.ocrPrescription(input.imageBase64)
  const medications = Array.isArray(ocrResult.medications)
    ? (ocrResult.medications as Array<Record<string, unknown>>)
    : []

  const prescription = await Prescription.create({
    patientId: input.patientId,
    source: 'EXTERNAL_OCR',
    status: 'ISSUED',
    diagnosis: [],
    medications: medications.map(mapExtractedMedication),
    labOrders: [],
    attachmentUrls: input.sourceImageUrl ? [input.sourceImageUrl] : [],
    externalUpload: {
      uploadedByPatient: true,
      uploadedAt: new Date(),
      ocrConfidence: averageConfidence(medications),
      verifiedByPatient: false,
    },
    blockchain: { status: 'NOT_QUEUED' },
    issuedAt: new Date(),
    validUntil: undefined,
    isExpired: false,
  })

  return { prescription, ocrResult }
}

export async function confirmExternalPrescription(input: {
  prescriptionId: string
  patientId: string
  medications: unknown[]
}): Promise<unknown> {
  const prescription = await Prescription.findOneAndUpdate(
    { _id: input.prescriptionId, patientId: input.patientId, source: 'EXTERNAL_OCR' },
    {
      $set: {
        medications: input.medications,
        'externalUpload.verifiedByPatient': true,
        'externalUpload.verifiedAt': new Date(),
      },
    },
    { new: true, runValidators: true }
  )
  if (!prescription) throw new Error('External prescription not found')
  return prescription
}
