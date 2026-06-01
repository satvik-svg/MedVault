import { AccessLog } from '../models/AccessLog.ts'
import { Doctor } from '../models/Doctor.ts'
import { Lab } from '../models/Lab.ts'
import { LabOrder, type ILabOrder, type LabOrderStatus } from '../models/LabOrder.ts'
import { LabReport, type ILabReport } from '../models/LabReport.ts'
import { Patient } from '../models/Patient.ts'
import { Visit } from '../models/Visit.ts'
import { enqueueLabReportAnchor } from '../jobs/queues.ts'
import type { AccessTokenPayload } from '../utils/jwt.ts'
import { addDays } from '../utils/time.ts'
import { assertActiveConsent } from './consent.service.ts'
import { sendWhatsApp } from './notification.service.ts'
import { deliverLabReportToDoctor } from './lab-report-delivery.service.ts'
import { detectAbnormalities, type LabResultInput } from './lab.service.ts'

export interface LabOrderTestInput {
  loincCode: string
  displayName?: string
  notes?: string
}

export interface CreateLabOrderInput {
  patientId: string
  visitId: string
  prescriptionId?: string
  labId: string
  tests: LabOrderTestInput[]
  homeCollectionRequested?: boolean
  homeCollectionAddress?: string
  preferredCollectionTime?: Date
}

const ACTIVE_LAB_STATUSES: LabOrderStatus[] = [
  'PATIENT_NOTIFIED',
  'ACKNOWLEDGED_BY_LAB',
  'PATIENT_VISITED',
  'SAMPLE_COLLECTED',
  'IN_PROCESSING',
]

const allowedTransitions: Record<LabOrderStatus, LabOrderStatus[]> = {
  CREATED: ['PATIENT_NOTIFIED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_LAB', 'EXPIRED'],
  PATIENT_NOTIFIED: ['ACKNOWLEDGED_BY_LAB', 'PATIENT_VISITED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_LAB', 'EXPIRED'],
  ACKNOWLEDGED_BY_LAB: ['PATIENT_VISITED', 'SAMPLE_COLLECTED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_LAB'],
  PATIENT_VISITED: ['SAMPLE_COLLECTED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_LAB'],
  SAMPLE_COLLECTED: ['IN_PROCESSING', 'REPORT_UPLOADED', 'CANCELLED_BY_LAB'],
  IN_PROCESSING: ['REPORT_UPLOADED', 'CANCELLED_BY_LAB'],
  REPORT_UPLOADED: ['DELIVERED_TO_DOCTOR'],
  DELIVERED_TO_DOCTOR: [],
  CANCELLED_BY_PATIENT: [],
  CANCELLED_BY_LAB: [],
  EXPIRED: [],
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `MV-LO-${year}-${suffix}`
}

function generateReportNumber(): string {
  const year = new Date().getFullYear()
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `MV-LAB-${year}-${suffix}`
}

function formatAddress(address: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string }): string {
  return [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ')
}

export function isValidLabOrderTransition(from: LabOrderStatus, to: LabOrderStatus): boolean {
  return allowedTransitions[from]?.includes(to) || false
}

export async function createLabOrder(input: CreateLabOrderInput, doctorUser: AccessTokenPayload): Promise<ILabOrder> {
  if (!doctorUser.doctorId) throw new Error('Doctor profile is required')
  if (!input.tests.length) throw new Error('At least one lab test is required')

  await assertActiveConsent(input.patientId, doctorUser.userId, ['FULL', 'LAB_REPORTS'])

  const [patient, doctor, lab, visit] = await Promise.all([
    Patient.findById(input.patientId),
    Doctor.findById(doctorUser.doctorId),
    Lab.findById(input.labId),
    Visit.findById(input.visitId),
  ])
  if (!patient) throw new Error('Patient not found')
  if (!doctor) throw new Error('Doctor not found')
  if (!lab || lab.trustLevel !== 'VERIFIED' || !lab.isActive) throw new Error('Selected lab is not verified')
  if (!visit || visit.patientId.toString() !== patient._id.toString() || visit.doctorId?.toString() !== doctor._id.toString()) {
    throw new Error('Visit not found for this doctor and patient')
  }

  const tests = input.tests.map((test) => {
    const labTest = lab.testsOffered.find((offered: any) => offered.loincCode === test.loincCode)
    return {
      loincCode: test.loincCode,
      displayName: labTest?.displayName || test.displayName || test.loincCode,
      sampleType: labTest?.sampleType,
      fastingRequired: labTest?.fastingRequired,
      notes: test.notes,
      estimatedPrice: labTest?.price,
    }
  })
  const totalEstimatedPrice = tests.reduce((sum, test) => sum + (test.estimatedPrice || 0), 0)

  const order = await LabOrder.create({
    patientId: patient._id,
    doctorId: doctor._id,
    visitId: visit._id,
    prescriptionId: input.prescriptionId,
    labId: lab._id,
    orderNumber: generateOrderNumber(),
    tests,
    totalEstimatedPrice,
    homeCollectionRequested: !!input.homeCollectionRequested,
    homeCollectionAddress: input.homeCollectionAddress,
    preferredCollectionTime: input.preferredCollectionTime,
    status: 'CREATED',
    statusHistory: [{ status: 'CREATED', timestamp: new Date(), actor: doctorUser.userId }],
    expiresAt: addDays(new Date(), 30),
  })

  await Visit.updateOne({ _id: visit._id }, { $addToSet: { labOrderIds: order._id } })
  await Lab.updateOne({ _id: lab._id }, { $inc: { 'stats.totalOrdersReceived': 1 } })

  await sendWhatsApp(
    patient.contact.primaryPhone,
    `Dr. ${doctor.fullName} ordered tests at ${lab.displayName}. Tests: ${tests.map((test) => test.displayName).join(', ')}. Address: ${formatAddress(lab.address)}. Expected cost: Rs ${totalEstimatedPrice}.`
  )
  if (lab.phone) {
    await sendWhatsApp(
      lab.phone,
      `New MedVault lab order ${order.orderNumber} from Dr. ${doctor.fullName}. Patient: ${patient.fullName}. Tests: ${tests.map((test) => test.displayName).join(', ')}.`
    )
  }

  order.status = 'PATIENT_NOTIFIED'
  order.statusHistory.push({ status: 'PATIENT_NOTIFIED', timestamp: new Date() })
  await order.save()

  await AccessLog.create({
    actorUserId: doctorUser.userId,
    actorRole: doctorUser.role,
    action: 'CREATE_LAB_ORDER',
    targetType: 'LabOrder',
    targetId: order._id,
    patientId: patient._id,
  })

  return order
}

export async function listPendingLabOrders(labId: string): Promise<unknown[]> {
  return LabOrder.find({ labId, status: { $in: ACTIVE_LAB_STATUSES } })
    .populate('patientId', 'fullName medvaultId contact dateOfBirth sex')
    .populate('doctorId', 'fullName practice')
    .sort({ createdAt: -1 })
    .lean()
}

export async function getLabOrderForLab(orderId: string, labId: string): Promise<unknown> {
  const order = await LabOrder.findOne({ _id: orderId, labId })
    .populate('patientId', 'fullName medvaultId contact dateOfBirth sex')
    .populate('doctorId', 'fullName practice')
    .populate('labReportId')
    .lean()
  if (!order) throw new Error('Lab order not found')
  return order
}

export async function listPatientLabOrders(patientId: string): Promise<unknown[]> {
  return LabOrder.find({ patientId })
    .populate('labId', 'displayName address phone homeCollectionAvailable')
    .populate('doctorId', 'fullName practice')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
}

export async function updateLabOrderStatus(orderId: string, labId: string, actorUserId: string, newStatus: LabOrderStatus, note?: string): Promise<ILabOrder> {
  const order = await LabOrder.findById(orderId)
  if (!order) throw new Error('Lab order not found')
  if (order.labId.toString() !== labId) throw new Error('Not your order')
  if (!isValidLabOrderTransition(order.status, newStatus)) throw new Error('Invalid status transition')

  order.status = newStatus
  order.statusHistory.push({ status: newStatus, timestamp: new Date(), actor: actorUserId as any, note })
  await order.save()
  return order
}

export async function markPatientUsingAlternateLab(orderId: string, patientId: string, actorUserId: string, alternateLabName: string): Promise<ILabOrder> {
  const order = await LabOrder.findOne({ _id: orderId, patientId })
  if (!order) throw new Error('Lab order not found')
  if (!isValidLabOrderTransition(order.status, 'CANCELLED_BY_PATIENT')) throw new Error('Lab order cannot be cancelled now')
  order.status = 'CANCELLED_BY_PATIENT'
  order.patientWentToAlternateLab = true
  order.alternateLabName = alternateLabName
  order.statusHistory.push({
    status: 'CANCELLED_BY_PATIENT',
    timestamp: new Date(),
    actor: actorUserId as any,
    note: `Patient chose alternate lab: ${alternateLabName}`,
  })
  await order.save()
  return order
}

export async function uploadLabOrderReport(input: {
  orderId: string
  labId: string
  operatorUserId: string
  method: 'STRUCTURED' | 'PDF_UPLOAD_WITH_OCR' | 'CSV_UPLOAD'
  collectionDate?: Date
  reportDate?: Date
  results?: LabResultInput[]
  attachmentUrls?: string[]
  ocrText?: string
  ocrConfidence?: number
}): Promise<ILabReport> {
  const order = await LabOrder.findById(input.orderId)
  if (!order) throw new Error('Lab order not found')
  if (order.labId.toString() !== input.labId) throw new Error('Not your order')
  if (!['SAMPLE_COLLECTED', 'IN_PROCESSING', 'PATIENT_VISITED', 'ACKNOWLEDGED_BY_LAB'].includes(order.status)) {
    throw new Error('Lab order is not ready for report upload')
  }

  const results = detectAbnormalities(input.results || [])
  const hasCriticalValues = results.some((result) => ['CRITICAL_LOW', 'CRITICAL_HIGH'].includes(result.flag || ''))
  const hasAbnormalValues = hasCriticalValues || results.some((result) => ['LOW', 'HIGH', 'ABNORMAL'].includes(result.flag || ''))

  const report = await LabReport.create({
    patientId: order.patientId,
    labId: order.labId,
    labOrderId: order._id,
    uploadedByUserId: input.operatorUserId,
    uploadedByOperatorUserId: input.operatorUserId,
    orderedByDoctorId: order.doctorId,
    prescriptionId: order.prescriptionId,
    reportNumber: generateReportNumber(),
    source: 'MEDVAULT_NATIVE_LAB_PARTNER',
    collectionDate: input.collectionDate,
    reportDate: input.reportDate || new Date(),
    results,
    hasAbnormalValues,
    hasCriticalValues,
    attachmentUrls: input.attachmentUrls || [],
    ocrText: input.ocrText,
    aiConfidence: input.ocrConfidence,
    isVerified: true,
    verifiedBy: input.operatorUserId,
    externalUpload: input.method === 'PDF_UPLOAD_WITH_OCR' ? {
      uploadedByPatient: false,
      uploadedAt: new Date(),
      ocrConfidence: input.ocrConfidence,
      verifiedByLab: true,
    } : undefined,
    blockchain: { status: 'QUEUED' },
  })

  order.status = 'REPORT_UPLOADED'
  order.labReportId = report._id as any
  order.statusHistory.push({ status: 'REPORT_UPLOADED', timestamp: new Date(), actor: input.operatorUserId as any })
  order.status = 'DELIVERED_TO_DOCTOR'
  order.statusHistory.push({ status: 'DELIVERED_TO_DOCTOR', timestamp: new Date() })
  await order.save()

  await Lab.updateOne({ _id: order.labId }, { $inc: { 'stats.totalReportsUploaded': 1 } })
  await AccessLog.create({
    actorUserId: input.operatorUserId,
    action: 'UPLOAD_LAB',
    targetType: 'LabReport',
    targetId: report._id,
    patientId: order.patientId,
    metadata: { hasCriticalValues, hasAbnormalValues, labOrderId: order._id },
  })
  await enqueueLabReportAnchor(report._id.toString())
  await deliverLabReportToDoctor(report)

  return report
}
