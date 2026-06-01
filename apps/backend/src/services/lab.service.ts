import { AccessLog } from '../models/AccessLog.ts'
import { Clinic } from '../models/Clinic.ts'
import { LabReport, type ILabReport } from '../models/LabReport.ts'
import { Patient } from '../models/Patient.ts'
import { enqueueLabReportAnchor } from '../jobs/queues.ts'
import { sendWhatsApp, sendWhatsAppCritical } from './notification.service.ts'

export interface LabResultInput {
  loincCode?: string
  testName: string
  value?: unknown
  unit?: string
  referenceRange?: {
    low?: number
    high?: number
    textual?: string
  }
  flag?: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH' | 'ABNORMAL'
  notes?: string
}

function generateReportNumber(): string {
  const year = new Date().getFullYear()
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `MV-LAB-${year}-${suffix}`
}

export function detectAbnormalities(results: LabResultInput[]): LabResultInput[] {
  return results.map((result) => {
    if (result.flag) return result
    if (typeof result.value !== 'number') return result

    const low = result.referenceRange?.low
    const high = result.referenceRange?.high
    if (typeof low === 'number' && result.value < low * 0.5) return { ...result, flag: 'CRITICAL_LOW' }
    if (typeof low === 'number' && result.value < low) return { ...result, flag: 'LOW' }
    if (typeof high === 'number' && result.value > high * 1.5) return { ...result, flag: 'CRITICAL_HIGH' }
    if (typeof high === 'number' && result.value > high) return { ...result, flag: 'HIGH' }
    if (typeof low === 'number' || typeof high === 'number') return { ...result, flag: 'NORMAL' }
    return result
  })
}

export async function uploadStructuredLabReport(input: {
  patientId: string
  labClinicId: string
  operatorUserId: string
  orderedByDoctorId?: string
  prescriptionId?: string
  collectionDate?: Date
  reportDate: Date
  results: LabResultInput[]
  attachmentUrls?: string[]
}): Promise<ILabReport> {
  const clinic = await Clinic.findById(input.labClinicId)
  if (!clinic) throw new Error('Lab clinic not found')
  if (!['DIAGNOSTIC_LAB', 'HOSPITAL', 'MULTI_SPECIALTY'].includes(clinic.type)) {
    throw new Error('Clinic is not authorized for lab uploads')
  }

  const patient = await Patient.findById(input.patientId)
  if (!patient) throw new Error('Patient not found')

  const results = detectAbnormalities(input.results)
  const hasCriticalValues = results.some((result) => ['CRITICAL_LOW', 'CRITICAL_HIGH'].includes(result.flag || ''))
  const hasAbnormalValues = hasCriticalValues || results.some((result) => ['LOW', 'HIGH', 'ABNORMAL'].includes(result.flag || ''))

  const report = await LabReport.create({
    patientId: input.patientId,
    uploadedByUserId: input.operatorUserId,
    clinicId: input.labClinicId,
    labClinicId: input.labClinicId,
    orderedByDoctorId: input.orderedByDoctorId,
    prescriptionId: input.prescriptionId,
    reportNumber: generateReportNumber(),
    source: 'MEDVAULT_NATIVE',
    collectionDate: input.collectionDate,
    reportDate: input.reportDate,
    results,
    hasAbnormalValues,
    hasCriticalValues,
    attachmentUrls: input.attachmentUrls || [],
    isVerified: true,
    verifiedBy: input.operatorUserId,
    blockchain: { status: 'QUEUED' },
  })

  await AccessLog.create({
    actorUserId: input.operatorUserId,
    action: 'UPLOAD_LAB',
    targetType: 'LabReport',
    targetId: report._id,
    patientId: input.patientId,
    metadata: { hasCriticalValues, hasAbnormalValues },
  })

  if (hasCriticalValues) {
    await sendWhatsAppCritical(patient.contact.primaryPhone, `Critical lab result available in MedVault report ${report.reportNumber}. Please contact your doctor.`)
  } else {
    await sendWhatsApp(patient.contact.primaryPhone, `New lab report ${report.reportNumber} is available in MedVault.`)
  }

  await enqueueLabReportAnchor(report._id.toString())
  return report
}

export async function listPatientLabReports(patientId: string): Promise<unknown[]> {
  return LabReport.find({ patientId, deletedAt: { $exists: false } })
    .sort({ reportDate: -1 })
    .lean()
}

export async function saveExternalLabUpload(input: {
  patientId: string
  uploadedByUserId: string
  fileUrl: string
  fileType: string
  reportDate?: Date
  ocrText?: string
  aiConfidence?: number
}): Promise<ILabReport> {
  return LabReport.create({
    patientId: input.patientId,
    uploadedByUserId: input.uploadedByUserId,
    source: 'EXTERNAL_OCR',
    fileUrl: input.fileUrl,
    fileType: input.fileType,
    reportDate: input.reportDate || new Date(),
    results: [],
    hasAbnormalValues: false,
    hasCriticalValues: false,
    attachmentUrls: [input.fileUrl],
    ocrText: input.ocrText,
    aiConfidence: input.aiConfidence,
    isVerified: false,
    externalUpload: {
      uploadedByPatient: true,
      uploadedAt: new Date(),
      ocrConfidence: input.aiConfidence,
      verifiedByLab: false,
    },
    blockchain: { status: 'NOT_QUEUED' },
  })
}
