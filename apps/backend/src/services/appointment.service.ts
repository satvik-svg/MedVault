import { Appointment } from '../models/Appointment.ts'
import { Doctor } from '../models/Doctor.ts'
import { DoctorAvailability } from '../models/DoctorAvailability.ts'
import { Patient } from '../models/Patient.ts'
import { addMinutes, computeAge, endOfDay, isSameCalendarDay, startOfDay } from '../utils/time.ts'
import { aiClient } from './ai-client.service.ts'
import { sendWhatsApp } from './notification.service.ts'

export interface AppointmentSlot {
  slotStart: Date
  slotEnd: Date
}

function timeOnDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10))
  const next = new Date(date)
  next.setHours(hours || 0, minutes || 0, 0, 0)
  return next
}

function overlaps(a: AppointmentSlot, b: AppointmentSlot): boolean {
  return a.slotStart < b.slotEnd && a.slotEnd > b.slotStart
}

function generateSlots(date: Date, startTime: string, endTime: string, durationMinutes: number): AppointmentSlot[] {
  const slots: AppointmentSlot[] = []
  let cursor = timeOnDate(date, startTime)
  const end = timeOnDate(date, endTime)
  while (addMinutes(cursor, durationMinutes) <= end) {
    const slotStart = new Date(cursor)
    const slotEnd = addMinutes(cursor, durationMinutes)
    slots.push({ slotStart, slotEnd })
    cursor = slotEnd
  }
  return slots
}

export async function upsertDoctorAvailability(input: {
  doctorId: string
  clinicId: string
  weekday: number
  startTime: string
  endTime: string
  slotDurationMinutes?: number
  exceptionDates?: Date[]
}): Promise<unknown> {
  return DoctorAvailability.findOneAndUpdate(
    { doctorId: input.doctorId, clinicId: input.clinicId, weekday: input.weekday },
    {
      $set: {
        startTime: input.startTime,
        endTime: input.endTime,
        slotDurationMinutes: input.slotDurationMinutes || 15,
        exceptionDates: input.exceptionDates || [],
        isActive: true,
      },
    },
    { upsert: true, new: true, runValidators: true }
  )
}

export async function findAvailableSlots(doctorId: string, clinicId: string, date: Date): Promise<AppointmentSlot[]> {
  const weekday = date.getDay()
  const availability = await DoctorAvailability.findOne({ doctorId, clinicId, weekday, isActive: true }).lean()
  if (!availability) return []

  if ((availability.exceptionDates || []).some((exceptionDate) => isSameCalendarDay(exceptionDate, date))) {
    return []
  }

  const slots = generateSlots(date, availability.startTime, availability.endTime, availability.slotDurationMinutes)
  const bookedAppointments = await Appointment.find({
    doctorId,
    slotStart: { $gte: startOfDay(date), $lte: endOfDay(date) },
    status: { $nin: ['CANCELLED', 'NO_SHOW'] },
  }).select('slotStart slotEnd').lean()

  return slots.filter((slot) => !bookedAppointments.some((booked) => overlaps(slot, {
    slotStart: booked.slotStart,
    slotEnd: booked.slotEnd,
  })))
}

export async function bookAppointment(input: {
  patientId: string
  doctorId: string
  clinicId: string
  slotStart: Date
  type?: 'IN_PERSON' | 'TELEMEDICINE' | 'FOLLOW_UP'
  chiefComplaint?: string
}): Promise<unknown> {
  const doctor = await Doctor.findById(input.doctorId)
  if (!doctor) throw new Error('Doctor not found')

  const hasAffiliation = doctor.affiliations.some((affiliation) =>
    affiliation.clinicId.toString() === input.clinicId
    && affiliation.isActive
    && affiliation.confirmedByClinic
    && affiliation.confirmedByDoctor
  )
  if (!hasAffiliation) throw new Error('Doctor is not active at this clinic')

  const patient = await Patient.findById(input.patientId)
  if (!patient) throw new Error('Patient not found')

  const slots = await findAvailableSlots(input.doctorId, input.clinicId, input.slotStart)
  const selected = slots.find((slot) => slot.slotStart.getTime() === input.slotStart.getTime())
  if (!selected) throw new Error('Slot no longer available')

  const appointment = await Appointment.create({
    patientId: input.patientId,
    doctorId: input.doctorId,
    clinicId: input.clinicId,
    slotStart: selected.slotStart,
    slotEnd: selected.slotEnd,
    scheduledAt: selected.slotStart,
    duration: Math.round((selected.slotEnd.getTime() - selected.slotStart.getTime()) / 60_000),
    status: 'BOOKED',
    type: input.type || 'IN_PERSON',
    chiefComplaint: input.chiefComplaint,
  })

  await sendWhatsApp(patient.contact.primaryPhone, `Appointment booked for ${selected.slotStart.toLocaleString()}.`)
  return appointment
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'CONFIRMED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
  metadata: { cancelReason?: string; cancelledBy?: 'PATIENT' | 'DOCTOR' | 'CLINIC' } = {}
): Promise<unknown> {
  const update: Record<string, unknown> = { status }
  if (status === 'IN_CONSULTATION') update.consultationStartedAt = new Date()
  if (status === 'COMPLETED') update.consultationEndedAt = new Date()
  if (status === 'CANCELLED') {
    update.cancelledAt = new Date()
    update.cancelReason = metadata.cancelReason
    update.cancelledBy = metadata.cancelledBy
  }
  return Appointment.findByIdAndUpdate(appointmentId, { $set: update }, { new: true })
}

export async function processPreVisitSymptoms(input: {
  appointmentId: string
  text?: string
  audioBase64?: string
  audioUrl?: string
}): Promise<unknown> {
  const appointment = await Appointment.findById(input.appointmentId)
  if (!appointment) throw new Error('Appointment not found')

  let text = input.text || ''
  if (!text && input.audioBase64) {
    const transcription = await aiClient.transcribe(input.audioBase64)
    text = String(transcription.text || '')
  }

  const patient = await Patient.findById(appointment.patientId)
  if (!patient) throw new Error('Patient not found')

  const ner = await aiClient.extractEntities(text)
  const diagnosis = await aiClient.diagnose(ner.entities, computeAge(patient.dateOfBirth), patient.sex)

  appointment.preVisitSymptoms = {
    rawText: text,
    audioUrl: input.audioUrl,
    extractedEntities: ner.entities,
    aiTop3Diagnoses: diagnosis.top_diagnoses,
    redFlags: diagnosis.red_flags.map((flag) => String(flag.alert || flag.category || flag)),
  }
  await appointment.save()
  return appointment.preVisitSymptoms
}
