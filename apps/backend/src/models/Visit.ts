import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IVisit extends Document {
  patientId: ObjectId
  doctorId: ObjectId
  startedAt: Date
  endedAt?: Date
  status: 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
  type: 'NEW_PATIENT' | 'FOLLOW_UP' | 'WALK_IN'
  chiefComplaint?: string
  preVisitSymptoms?: {
    rawText?: string
    audioUrl?: string
    extractedEntities?: unknown[]
    aiTop3Diagnoses?: unknown[]
    redFlags?: string[]
    recordedAt?: Date
  }
  doctorNotes?: string
  prescriptionId?: ObjectId
  labOrderIds: ObjectId[]
  consultationFee?: number
  paymentStatus?: 'PENDING' | 'PAID' | 'WAIVED'
  paymentMethod?: 'CASH' | 'UPI' | 'CARD'
  createdBy?: ObjectId
  cancelledAt?: Date
  cancelReason?: string
  createdAt: Date
  updatedAt: Date
}

const VisitSchema = new Schema<IVisit>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  startedAt: { type: Date, required: true, default: Date.now, index: true },
  endedAt: Date,
  status: {
    type: String,
    enum: ['CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'],
    default: 'CHECKED_IN',
    index: true,
  },
  type: { type: String, enum: ['NEW_PATIENT', 'FOLLOW_UP', 'WALK_IN'], default: 'WALK_IN' },
  chiefComplaint: String,
  preVisitSymptoms: {
    rawText: String,
    audioUrl: String,
    extractedEntities: [Schema.Types.Mixed],
    aiTop3Diagnoses: [Schema.Types.Mixed],
    redFlags: [String],
    recordedAt: Date,
  },
  doctorNotes: String,
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
  labOrderIds: [{ type: Schema.Types.ObjectId, ref: 'LabOrder' }],
  consultationFee: Number,
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'WAIVED'] },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'CARD'] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date,
  cancelReason: String,
}, { timestamps: true })

VisitSchema.index({ doctorId: 1, startedAt: -1 })
VisitSchema.index({ patientId: 1, startedAt: -1 })

export const Visit = mongoose.model<IVisit>('Visit', VisitSchema)
