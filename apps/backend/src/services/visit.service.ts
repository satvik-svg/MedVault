import { AccessLog } from '../models/AccessLog.ts'
import { Doctor } from '../models/Doctor.ts'
import { Patient } from '../models/Patient.ts'
import { Visit, type IVisit } from '../models/Visit.ts'
import type { AccessTokenPayload } from '../utils/jwt.ts'
import { checkOrRequestConsent } from './consent.service.ts'

export interface CreateVisitInput {
  patientId?: string
  patientMedvaultId?: string
  doctorId?: string
  type?: IVisit['type']
  chiefComplaint?: string
  preVisitSymptoms?: IVisit['preVisitSymptoms']
  consultationFee?: number
}

export interface UpdateVisitInput {
  status?: IVisit['status']
  chiefComplaint?: string
  doctorNotes?: string
  preVisitSymptoms?: IVisit['preVisitSymptoms']
  consultationFee?: number
  paymentStatus?: IVisit['paymentStatus']
  paymentMethod?: IVisit['paymentMethod']
  cancelReason?: string
}

export async function createVisit(input: CreateVisitInput, actor: AccessTokenPayload): Promise<{ visit?: IVisit; consent?: unknown }> {
  if (!actor.doctorId) throw new Error('Doctor profile is required')
  const doctor = await Doctor.findById(input.doctorId || actor.doctorId)
  if (!doctor) throw new Error('Doctor not found')

  const patient = input.patientId
    ? await Patient.findById(input.patientId)
    : await Patient.findOne({ medvaultId: input.patientMedvaultId })
  if (!patient) throw new Error('Patient not found')

  const consent = await checkOrRequestConsent(patient._id.toString(), actor.userId, {
    scope: ['FULL'],
    purpose: 'CONSULTATION',
    granteeType: 'DOCTOR',
  })

  if (consent.decision === 'PENDING_PATIENT_APPROVAL') {
    return { consent }
  }

  const visit = await Visit.create({
    patientId: patient._id,
    doctorId: doctor._id,
    status: 'CHECKED_IN',
    type: input.type || 'WALK_IN',
    chiefComplaint: input.chiefComplaint,
    preVisitSymptoms: input.preVisitSymptoms,
    consultationFee: input.consultationFee,
    paymentStatus: input.consultationFee ? 'PENDING' : undefined,
    createdBy: actor.userId,
  })

  await AccessLog.create({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'CREATE_VISIT',
    targetType: 'Visit',
    targetId: visit._id,
    patientId: patient._id,
  })

  return { visit, consent }
}

export async function updateVisit(visitId: string, input: UpdateVisitInput, actor: AccessTokenPayload): Promise<IVisit> {
  const visit = await Visit.findById(visitId)
  if (!visit) throw new Error('Visit not found')
  if (actor.role === 'DOCTOR' && actor.doctorId && visit.doctorId.toString() !== actor.doctorId) {
    throw new Error('Not your visit')
  }

  if (input.status) {
    visit.status = input.status
    if (input.status === 'COMPLETED' && !visit.endedAt) visit.endedAt = new Date()
    if (input.status === 'CANCELLED') {
      visit.cancelledAt = new Date()
      visit.cancelReason = input.cancelReason
    }
  }
  if (input.chiefComplaint !== undefined) visit.chiefComplaint = input.chiefComplaint
  if (input.doctorNotes !== undefined) visit.doctorNotes = input.doctorNotes
  if (input.preVisitSymptoms !== undefined) visit.preVisitSymptoms = input.preVisitSymptoms
  if (input.consultationFee !== undefined) visit.consultationFee = input.consultationFee
  if (input.paymentStatus !== undefined) visit.paymentStatus = input.paymentStatus
  if (input.paymentMethod !== undefined) visit.paymentMethod = input.paymentMethod

  await visit.save()
  return visit
}

export async function listDoctorVisits(doctorId: string, status?: string): Promise<unknown[]> {
  const query: Record<string, unknown> = { doctorId }
  if (status) query.status = status
  return Visit.find(query)
    .populate('patientId', 'fullName medvaultId contact dateOfBirth sex')
    .sort({ startedAt: -1 })
    .limit(100)
    .lean()
}

export async function listPatientVisits(patientId: string): Promise<unknown[]> {
  return Visit.find({ patientId })
    .populate('doctorId', 'fullName practice')
    .sort({ startedAt: -1 })
    .limit(100)
    .lean()
}
