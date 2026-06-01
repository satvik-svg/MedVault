import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IAppointment extends Document {
  patientId: ObjectId
  doctorId: ObjectId
  clinicId: ObjectId
  slotStart: Date
  slotEnd: Date
  scheduledAt?: Date
  duration?: number
  status: 'BOOKED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'SCHEDULED' | 'IN_PROGRESS'
  type: 'IN_PERSON' | 'TELEMEDICINE' | 'FOLLOW_UP' | 'VIDEO' | 'PHONE'
  chiefComplaint?: string
  preVisitSymptoms?: {
    rawText?: string
    audioUrl?: string
    extractedEntities?: unknown[]
    aiTop3Diagnoses?: unknown[]
    redFlags?: string[]
    embedding?: number[]
  }
  consultationStartedAt?: Date
  consultationEndedAt?: Date
  doctorNotes?: string
  prescriptionId?: ObjectId
  consultationFee?: number
  paymentStatus?: 'PENDING' | 'PAID' | 'WAIVED'
  cancelledAt?: Date
  cancelReason?: string
  cancelledBy?: 'PATIENT' | 'DOCTOR' | 'CLINIC'
  notes?: string
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const AppointmentSchema = new Schema<IAppointment>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  slotStart: { type: Date, required: true, index: true },
  slotEnd: { type: Date, required: true },
  scheduledAt: { type: Date, index: true },
  duration: { type: Number, default: 30 },
  status: {
    type: String,
    enum: ['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'SCHEDULED', 'IN_PROGRESS'],
    default: 'BOOKED',
    index: true,
  },
  type: { type: String, enum: ['IN_PERSON', 'TELEMEDICINE', 'FOLLOW_UP', 'VIDEO', 'PHONE'], default: 'IN_PERSON' },
  chiefComplaint: String,
  preVisitSymptoms: {
    rawText: String,
    audioUrl: String,
    extractedEntities: [Schema.Types.Mixed],
    aiTop3Diagnoses: [Schema.Types.Mixed],
    redFlags: [String],
    embedding: [Number],
  },
  consultationStartedAt: Date,
  consultationEndedAt: Date,
  doctorNotes: String,
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
  consultationFee: Number,
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'WAIVED'], default: 'PENDING' },
  cancelledAt: Date,
  cancelReason: String,
  cancelledBy: { type: String, enum: ['PATIENT', 'DOCTOR', 'CLINIC'] },
  notes: String,
  deletedAt: Date,
}, { timestamps: true })

AppointmentSchema.index({ clinicId: 1, slotStart: 1, status: 1 })
AppointmentSchema.index({ doctorId: 1, slotStart: 1 })
AppointmentSchema.index({ patientId: 1, slotStart: -1 })

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema)
