import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IConsentRequest extends Document {
  patientId: ObjectId
  granteeUserId: ObjectId
  granteeType: 'DOCTOR' | 'LAB'
  scope: string[]
  purpose: 'CONSULTATION' | 'LAB_REVIEW' | 'OTHER'
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED'
  expiresAt: Date
  resolvedAt?: Date
  nonce: string
  createdAt: Date
  updatedAt: Date
}

const ConsentRequestSchema = new Schema<IConsentRequest>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  granteeUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  granteeType: { type: String, enum: ['DOCTOR', 'LAB'], required: true },
  scope: [{ type: String, required: true }],
  purpose: {
    type: String,
    enum: ['CONSULTATION', 'LAB_REVIEW', 'OTHER'],
    default: 'OTHER',
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'DENIED', 'EXPIRED'],
    default: 'PENDING',
    index: true,
  },
  expiresAt: { type: Date, required: true, index: true },
  resolvedAt: Date,
  nonce: { type: String, required: true, unique: true },
}, { timestamps: true })

ConsentRequestSchema.index({ patientId: 1, granteeUserId: 1, status: 1 })

export const ConsentRequest = mongoose.model<IConsentRequest>('ConsentRequest', ConsentRequestSchema)
