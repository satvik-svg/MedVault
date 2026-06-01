import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IDoctorAvailability extends Document {
  doctorId: ObjectId
  clinicId: ObjectId
  weekday: number
  startTime: string
  endTime: string
  slotDurationMinutes: number
  exceptionDates: Date[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const DoctorAvailabilitySchema = new Schema<IDoctorAvailability>({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  weekday: { type: Number, required: true, min: 0, max: 6, index: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDurationMinutes: { type: Number, default: 15, min: 5 },
  exceptionDates: [Date],
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true })

DoctorAvailabilitySchema.index({ doctorId: 1, clinicId: 1, weekday: 1, isActive: 1 })

export const DoctorAvailability = mongoose.model<IDoctorAvailability>('DoctorAvailability', DoctorAvailabilitySchema)
