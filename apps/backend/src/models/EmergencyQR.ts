import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IEmergencyQR extends Document {
  patientId: ObjectId
  nonce: string
  signedPayload: string
  qrImageUrl?: string
  issuedAt: Date
  expiresAt: Date
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  patientLastKnownLocation?: {
    lat: number
    lng: number
    city?: string
    country?: string
    capturedAt: Date
  }
  scans: Array<{
    scannedAt: Date
    scannerLocation?: {
      lat?: number
      lng?: number
      city?: string
      country?: string
    }
    scannerIp?: string
    geoDistanceKm?: number
    isAnomaly: boolean
    accessedFields: string[]
  }>
  revokedAt?: Date
  revokedReason?: string
  revokedBy?: 'PATIENT' | 'SYSTEM_GEO_ANOMALY' | 'SYSTEM_EXPIRY'
  createdAt: Date
  updatedAt: Date
}

const EmergencyQRSchema = new Schema<IEmergencyQR>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  nonce: { type: String, required: true, unique: true, index: true },
  signedPayload: { type: String, required: true },
  qrImageUrl: String,
  issuedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  status: {
    type: String,
    enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
    default: 'ACTIVE',
    index: true,
  },
  patientLastKnownLocation: {
    lat: Number,
    lng: Number,
    city: String,
    country: String,
    capturedAt: Date,
  },
  scans: [{
    scannedAt: Date,
    scannerLocation: {
      lat: Number,
      lng: Number,
      city: String,
      country: String,
    },
    scannerIp: String,
    geoDistanceKm: Number,
    isAnomaly: Boolean,
    accessedFields: [String],
  }],
  revokedAt: Date,
  revokedReason: String,
  revokedBy: { type: String, enum: ['PATIENT', 'SYSTEM_GEO_ANOMALY', 'SYSTEM_EXPIRY'] },
}, { timestamps: true })

EmergencyQRSchema.index({ patientId: 1, status: 1 })

export const EmergencyQR = mongoose.model<IEmergencyQR>('EmergencyQR', EmergencyQRSchema)
