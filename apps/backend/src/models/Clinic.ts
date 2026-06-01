import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IClinic extends Document {
  hfrId?: string
  gstin?: string
  legalName: string
  displayName: string
  type: 'HOSPITAL' | 'CLINIC' | 'DIAGNOSTIC_LAB' | 'PHARMACY' | 'MULTI_SPECIALTY'
  address: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    pincode?: string
    geoLocation?: {
      type: string
      coordinates: number[]
    }
  }
  contact: {
    phone?: string
    email?: string
    website?: string
  }
  verification: {
    hfrVerified: boolean
    hfrVerifiedAt?: Date
    hfrRawResponse?: Record<string, unknown>
    gstVerified: boolean
    gstVerifiedAt?: Date
    domainVerified: boolean
    verifiedDomains: string[]
    documentsUploaded: Array<{
      type: 'REGISTRATION' | 'DOCTOR_DEGREE' | 'OWNERSHIP' | 'OTHER'
      url: string
      uploadedAt: Date
    }>
    manualReviewStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'
    reviewedBy?: ObjectId
    reviewedAt?: Date
    reviewNotes?: string
  }
  trustLevel: 'TIER_1_FULL' | 'TIER_2_PARTIAL' | 'TIER_3_UNVERIFIED'
  isActive: boolean
  adminUserIds: ObjectId[]
  stats: {
    totalDoctors: number
    totalPrescriptionsIssued: number
  }
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ClinicSchema = new Schema<IClinic>({
  hfrId: { type: String, unique: true, sparse: true, index: true },
  gstin: { type: String, unique: true, sparse: true, index: true },
  legalName: { type: String, required: true },
  displayName: { type: String, required: true },

  type: {
    type: String,
    enum: ['HOSPITAL', 'CLINIC', 'DIAGNOSTIC_LAB', 'PHARMACY', 'MULTI_SPECIALTY'],
    required: true,
  },

  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    geoLocation: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  },

  contact: {
    phone: String,
    email: String,
    website: String,
  },

  verification: {
    hfrVerified: { type: Boolean, default: false },
    hfrVerifiedAt: Date,
    hfrRawResponse: Schema.Types.Mixed,
    gstVerified: { type: Boolean, default: false },
    gstVerifiedAt: Date,
    domainVerified: { type: Boolean, default: false },
    verifiedDomains: [String],
    documentsUploaded: [{
      type: { type: String, enum: ['REGISTRATION', 'DOCTOR_DEGREE', 'OWNERSHIP', 'OTHER'] },
      url: String,
      uploadedAt: Date,
    }],
    manualReviewStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
  },

  trustLevel: {
    type: String,
    enum: ['TIER_1_FULL', 'TIER_2_PARTIAL', 'TIER_3_UNVERIFIED'],
    default: 'TIER_3_UNVERIFIED',
    index: true,
  },

  isActive: { type: Boolean, default: true },
  adminUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  stats: {
    totalDoctors: { type: Number, default: 0 },
    totalPrescriptionsIssued: { type: Number, default: 0 },
  },

  deletedAt: Date,
}, { timestamps: true })

ClinicSchema.index({ 'address.geoLocation': '2dsphere' })
ClinicSchema.index({ trustLevel: 1, isActive: 1 })

export const Clinic = mongoose.model<IClinic>('Clinic', ClinicSchema)
