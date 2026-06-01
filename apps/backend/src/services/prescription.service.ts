import { AccessLog } from '../models/AccessLog.ts'
import { Doctor } from '../models/Doctor.ts'
import { Patient } from '../models/Patient.ts'
import { Prescription, type IPrescription } from '../models/Prescription.ts'
import { RefDrug } from '../models/RefDrug.ts'
import { Visit } from '../models/Visit.ts'
import { enqueuePrescriptionAnchor } from '../jobs/queues.ts'
import { config } from '../config/env.ts'
import type { AccessTokenPayload } from '../utils/jwt.ts'
import { addDays, durationToDays } from '../utils/time.ts'
import { toQrDataUrl } from '../utils/qr.ts'
import { canonicalizePrescriptionForHashing } from '../utils/canonicalize.ts'
import { sha256HexPrefixed } from '../utils/hash.ts'
import { buildPrescriptionPdfDataUrl } from '../utils/pdf.ts'
import { assertActiveConsent } from './consent.service.ts'
import { runMedicationSafetyChecks } from './safety-checks.service.ts'
import { sendWhatsApp } from './notification.service.ts'
import { createLabOrder, type CreateLabOrderInput } from './lab-order.service.ts'

export class SafetyCheckError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message)
  }
}

type PrescriptionMedicationInput = IPrescription['medications'][number] & {
  overrides?: Record<string, { acknowledged?: boolean; reason?: string }>
}

export interface CreatePrescriptionInput {
  patientId: string
  doctorId?: string
  visitId?: string
  diagnosis?: IPrescription['diagnosis']
  medications?: PrescriptionMedicationInput[]
  drugs?: NonNullable<IPrescription['drugs']>
  labOrders?: IPrescription['labOrders']
  labOrder?: Omit<CreateLabOrderInput, 'patientId' | 'visitId' | 'prescriptionId'>
  followUp?: IPrescription['followUp']
  notes?: string
  allergyOverrideAcknowledged?: boolean
  interactionOverrideAcknowledged?: boolean
  aiAssistance?: IPrescription['aiAssistance']
}

function generatePrescriptionNumber(): string {
  const year = new Date().getFullYear()
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `MV-RX-${year}-${suffix}`
}

function legacyDrugsToMedications(drugs: NonNullable<IPrescription['drugs']> = []): PrescriptionMedicationInput[] {
  return drugs.map((drug) => ({
    rxnormCui: drug.rxnormCui || `UNMAPPED:${drug.displayName.toLowerCase().replace(/\s+/g, '-')}`,
    genericName: drug.genericName || drug.displayName,
    brandName: drug.displayName,
    strength: drug.dosage,
    route: drug.route?.toUpperCase() === 'IV' ? 'IV' : 'ORAL',
    dosage: {
      frequency: 'CUSTOM',
      duration: { value: parseInt(drug.duration, 10) || 1, unit: 'DAYS' },
      totalQuantity: drug.quantity,
      customInstructions: [drug.frequency, drug.instructions].filter(Boolean).join(' '),
    },
  }))
}

function computeValidUntil(medications: PrescriptionMedicationInput[]): Date {
  const longestDuration = Math.max(30, ...medications.map((medication) => durationToDays(medication.dosage?.duration)))
  return addDays(new Date(), longestDuration)
}

function computeMedicationEndDate(start: Date, medication: PrescriptionMedicationInput): Date {
  const days = durationToDays(medication.dosage?.duration) || 30
  return addDays(start, days)
}

function generateVerificationQR(prescription: IPrescription): { url: string; imageUrl: string } {
  const url = `${config.apiBaseUrl}/verify/prescription/${prescription._id.toString()}`
  return { url, imageUrl: toQrDataUrl(url, prescription.prescriptionNumber || 'Verify prescription') }
}

export async function updatePatientActiveMedications(patientId: string, prescription: IPrescription): Promise<void> {
  const startedAt = prescription.createdAt || new Date()
  for (const medication of prescription.medications || []) {
    const drug = await RefDrug.findOne({ rxnormCui: medication.rxnormCui }).lean()
    await Patient.updateOne(
      { _id: patientId },
      {
        $push: {
          activeMedications: {
            prescriptionId: prescription._id,
            rxnormCui: medication.rxnormCui,
            displayName: medication.brandName || medication.genericName,
            genericName: medication.genericName,
            strength: medication.strength,
            drugClass: drug?.drugClass,
            startedAt,
            expectedEndAt: computeMedicationEndDate(startedAt, medication),
          },
        },
      }
    )
  }
}

export async function cleanupExpiredMedications(): Promise<void> {
  await Patient.updateMany({}, { $pull: { activeMedications: { expectedEndAt: { $lt: new Date() } } } })
}

export async function createPrescription(
  input: CreatePrescriptionInput,
  doctorUser: AccessTokenPayload
): Promise<{ prescription: IPrescription; labOrders: unknown[] }> {
  if (!doctorUser.doctorId) throw new Error('Doctor profile is required')
  const doctor = await Doctor.findById(input.doctorId || doctorUser.doctorId)
  if (!doctor) throw new Error('Doctor not found')

  await assertActiveConsent(input.patientId, doctorUser.userId, ['FULL', 'PRESCRIPTIONS'])

  const patient = await Patient.findById(input.patientId)
  if (!patient) throw new Error('Patient not found')

  const medications = input.medications?.length ? input.medications : legacyDrugsToMedications(input.drugs)
  if (!medications.length) throw new Error('At least one medication is required')

  for (const medication of medications) {
    const safetyChecks = await runMedicationSafetyChecks(medication, patient)
    medication.safetyChecks = safetyChecks as unknown as Record<string, unknown>

    if (safetyChecks.allergyConflict && !input.allergyOverrideAcknowledged && !medication.overrides?.allergy?.acknowledged) {
      throw new SafetyCheckError('ALLERGY_CONFLICT', safetyChecks.allergyDetails || 'Allergy conflict detected', safetyChecks)
    }

    const hasContraindicatedInteraction = safetyChecks.interactionConflicts.some((conflict) => conflict.severity === 'CONTRAINDICATED')
    if (hasContraindicatedInteraction && !input.interactionOverrideAcknowledged) {
      throw new SafetyCheckError('CONTRAINDICATED_INTERACTION', 'Contraindicated drug interaction detected', safetyChecks)
    }
  }

  const prescription = await Prescription.create({
    patientId: input.patientId,
    doctorId: doctor._id,
    visitId: input.visitId,
    prescriptionNumber: generatePrescriptionNumber(),
    source: 'MEDVAULT_NATIVE',
    status: 'ISSUED',
    diagnosis: input.diagnosis || [],
    medications,
    labOrders: input.labOrders || [],
    followUp: input.followUp,
    notes: input.notes,
    aiAssistance: input.aiAssistance,
    issuedAt: new Date(),
    validUntil: computeValidUntil(medications),
    isExpired: false,
    blockchain: { status: 'QUEUED' },
  })

  prescription.pdfUrl = buildPrescriptionPdfDataUrl(prescription)
  prescription.verificationQR = generateVerificationQR(prescription)
  prescription.blockchain = {
    ...prescription.blockchain,
    contentHash: sha256HexPrefixed(canonicalizePrescriptionForHashing(prescription)),
    status: 'QUEUED',
  }
  await prescription.save()

  await updatePatientActiveMedications(input.patientId, prescription)
  await enqueuePrescriptionAnchor(prescription._id.toString())

  const labOrders = []
  if (input.labOrder && input.visitId) {
    const labOrder = await createLabOrder({
      ...input.labOrder,
      patientId: input.patientId,
      visitId: input.visitId,
      prescriptionId: prescription._id.toString(),
    }, doctorUser)
    labOrders.push(labOrder)
  }

  if (input.visitId) {
    await Visit.updateOne(
      { _id: input.visitId, doctorId: doctor._id, patientId: input.patientId },
      {
        $set: {
          prescriptionId: prescription._id,
          status: 'COMPLETED',
          endedAt: new Date(),
        },
        ...(labOrders.length ? { $addToSet: { labOrderIds: { $each: labOrders.map((order) => order._id) } } } : {}),
      }
    )
  }

  await AccessLog.create({
    actorUserId: doctorUser.userId,
    actorRole: doctorUser.role,
    action: 'CREATE_PRESCRIPTION',
    targetType: 'Prescription',
    targetId: prescription._id,
    patientId: input.patientId,
  })

  await sendWhatsApp(patient.contact.primaryPhone, `A new MedVault prescription ${prescription.prescriptionNumber} is available in your account.`)
  return { prescription, labOrders }
}

export async function listPatientPrescriptions(patientId: string): Promise<unknown[]> {
  return Prescription.find({ patientId, deletedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .lean()
}

export async function checkMedicationForPrescription(patientId: string, medication: PrescriptionMedicationInput): Promise<unknown> {
  return runMedicationSafetyChecks(medication, patientId)
}
