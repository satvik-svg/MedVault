import { AccessLog } from '../models/AccessLog.ts'
import { Doctor } from '../models/Doctor.ts'
import { Patient } from '../models/Patient.ts'
import { Visit, type IVisit } from '../models/Visit.ts'
import type { AccessTokenPayload } from '../utils/jwt.ts'
import { computeAge } from '../utils/time.ts'
import { aiClient, type AIDiagnosisResponse } from './ai-client.service.ts'
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

export interface AudioOrTextInput {
  text?: string
  audioBase64?: string
  audioUrl?: string
  language?: string
}

export interface RecordPreVisitSymptomsInput extends AudioOrTextInput {
  intendedDoctorId?: string
  expectedVisitDate?: string | Date
}

function normalizeRedFlags(redFlags: AIDiagnosisResponse['red_flags']): string[] {
  return redFlags
    .map((flag) => {
      if (typeof flag === 'string') return flag
      if (flag && typeof flag === 'object') {
        const record = flag as Record<string, unknown>
        const value = record.name || record.label || record.condition || record.symptom || record.reason
        if (typeof value === 'string') return value
      }
      return undefined
    })
    .filter((flag): flag is string => Boolean(flag))
}

async function buildPreVisitSymptoms(patientId: string, input: AudioOrTextInput): Promise<IVisit['preVisitSymptoms']> {
  if (!input.text && !input.audioBase64) {
    throw new Error('Either text or audioBase64 is required')
  }

  const transcription = input.text
    ? { text: input.text }
    : await aiClient.transcribe(input.audioBase64 || '', input.language || 'en')
  const text = String(transcription.text || '').trim()
  if (!text) throw new Error('No symptom text could be extracted')

  const [patient, ner] = await Promise.all([
    Patient.findById(patientId),
    aiClient.extractEntities(text),
  ])
  if (!patient) throw new Error('Patient not found')

  const diagnosis = await aiClient.diagnose(
    ner.entities,
    computeAge(patient.dateOfBirth),
    patient.sex
  )

  return {
    rawText: text,
    audioUrl: input.audioUrl,
    extractedEntities: ner.entities,
    aiTop3Diagnoses: diagnosis.top_diagnoses,
    redFlags: normalizeRedFlags(diagnosis.red_flags),
    recordedAt: new Date(),
  }
}

export async function processPreVisitSymptoms(visitId: string, input: AudioOrTextInput): Promise<IVisit> {
  const visit = await Visit.findById(visitId)
  if (!visit) throw new Error('Visit not found')
  visit.preVisitSymptoms = await buildPreVisitSymptoms(visit.patientId.toString(), input)
  await visit.save()
  return visit
}

export async function recordPreVisitSymptoms(patientId: string, input: RecordPreVisitSymptomsInput): Promise<IVisit> {
  const patient = await Patient.findById(patientId)
  if (!patient) throw new Error('Patient not found')

  if (input.intendedDoctorId) {
    const doctor = await Doctor.findById(input.intendedDoctorId)
    if (!doctor) throw new Error('Intended doctor not found')
  }

  const preVisitSymptoms = await buildPreVisitSymptoms(patientId, input)
  const visit = await Visit.create({
    patientId: patient._id,
    doctorId: input.intendedDoctorId,
    startedAt: input.expectedVisitDate ? new Date(input.expectedVisitDate) : new Date(),
    status: 'CHECKED_IN',
    type: 'WALK_IN',
    chiefComplaint: preVisitSymptoms?.rawText,
    preVisitSymptoms,
  })

  return visit
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

  const reusableSince = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const reusableVisit = await Visit.findOne({
    patientId: patient._id,
    status: 'CHECKED_IN',
    type: 'WALK_IN',
    startedAt: { $gte: reusableSince },
    preVisitSymptoms: { $exists: true },
    $or: [
      { doctorId: { $exists: false } },
      { doctorId: null },
      { doctorId: doctor._id },
    ],
  }).sort({ startedAt: -1 })

  if (reusableVisit) {
    reusableVisit.set({
      doctorId: doctor._id,
      chiefComplaint: input.chiefComplaint ?? reusableVisit.chiefComplaint,
      preVisitSymptoms: input.preVisitSymptoms ?? reusableVisit.preVisitSymptoms,
      consultationFee: input.consultationFee ?? reusableVisit.consultationFee,
      paymentStatus: input.consultationFee ? 'PENDING' : reusableVisit.paymentStatus,
      createdBy: actor.userId,
    })
    await reusableVisit.save()

    await AccessLog.create({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'ATTACH_PRE_VISIT',
      targetType: 'Visit',
      targetId: reusableVisit._id,
      patientId: patient._id,
    })

    return { visit: reusableVisit, consent }
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
  if (actor.role === 'DOCTOR' && actor.doctorId && visit.doctorId?.toString() !== actor.doctorId) {
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
