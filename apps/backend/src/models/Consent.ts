import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IConsent extends Document {
  patientId: ObjectId
  granteeUserId: ObjectId
  granteeType: 'DOCTOR' | 'LAB'
  scope: Array<'FULL' | 'PRESCRIPTIONS' | 'LAB_REPORTS' | 'DIAGNOSES' | 'ALLERGIES_AND_CONDITIONS' | 'DEMOGRAPHICS'>
  grantedAt: Date
  expiresAt: Date
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'AUTO_RENEWED'
  grantMethod: 'EXPLICIT_WHATSAPP' | 'AUTO_RECENT_DOCTOR'
  revokedAt?: Date
  revokedReason?: string
  nonce: string
  createdAt: Date
  updatedAt: Date
}

const ConsentSchema = new Schema<IConsent>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  granteeUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  granteeType: { type: String, enum: ['DOCTOR', 'LAB'], required: true },

  scope: [{
    type: String,
    enum: ['FULL', 'PRESCRIPTIONS', 'LAB_REPORTS', 'DIAGNOSES', 'ALLERGIES_AND_CONDITIONS', 'DEMOGRAPHICS'],
  }],

  grantedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },

  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'REVOKED', 'AUTO_RENEWED'],
    default: 'ACTIVE',
    index: true,
  },

  grantMethod: {
    type: String,
    enum: ['EXPLICIT_WHATSAPP', 'AUTO_RECENT_DOCTOR'],
  },

  revokedAt: Date,
  revokedReason: String,

  nonce: { type: String, required: true, unique: true },
}, { timestamps: true })

ConsentSchema.index({ patientId: 1, granteeUserId: 1, status: 1 })
ConsentSchema.index({ expiresAt: 1, status: 1 })

export const Consent = mongoose.model<IConsent>('Consent', ConsentSchema)
