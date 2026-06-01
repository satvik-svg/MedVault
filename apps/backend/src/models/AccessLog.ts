import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IAccessLog extends Document {
  actorUserId?: ObjectId
  actorRole?: string
  action: 'VIEW_PATIENT' | 'CREATE_PRESCRIPTION' | 'VIEW_PRESCRIPTION' | 'DISPENSE_PRESCRIPTION' | 'UPLOAD_LAB' | 'VIEW_LAB' | 'EMERGENCY_QR_GENERATE' | 'EMERGENCY_QR_SCAN' | 'CONSENT_REQUEST' | 'CONSENT_GRANT' | 'CONSENT_REVOKE' | 'BLOCKCHAIN_VERIFY'
  targetType?: string
  targetId?: ObjectId
  patientId?: ObjectId
  consentId?: ObjectId
  ip?: string
  userAgent?: string
  geoCountry?: string
  geoCity?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const AccessLogSchema = new Schema<IAccessLog>({
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  actorRole: String,

  action: {
    type: String,
    enum: ['VIEW_PATIENT', 'CREATE_PRESCRIPTION', 'VIEW_PRESCRIPTION', 'DISPENSE_PRESCRIPTION',
           'UPLOAD_LAB', 'VIEW_LAB', 'EMERGENCY_QR_GENERATE', 'EMERGENCY_QR_SCAN', 'CONSENT_REQUEST',
           'CONSENT_GRANT', 'CONSENT_REVOKE', 'BLOCKCHAIN_VERIFY'],
    required: true,
    index: true,
  },

  targetType: String,
  targetId: Schema.Types.ObjectId,
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },

  consentId: { type: Schema.Types.ObjectId, ref: 'Consent' },

  ip: String,
  userAgent: String,
  geoCountry: String,
  geoCity: String,

  metadata: Schema.Types.Mixed,

  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false })

AccessLogSchema.index({ patientId: 1, createdAt: -1 })
AccessLogSchema.index({ actorUserId: 1, createdAt: -1 })

export const AccessLog = mongoose.model<IAccessLog>('AccessLog', AccessLogSchema)
