import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IDoctor extends Document {
  userId: ObjectId
  fullName: string
  photoUrl?: string
  nmcRegNumber: string
  stateMedicalCouncil: string
  hprId?: string
  specializations: Array<{
    code?: string
    displayName: string
    isPrimary?: boolean
  }>
  qualifications: Array<{
    degree: string
    institution?: string
    year?: number
    certificateUrl?: string
  }>
  languages: string[]
  yearsExperience?: number
  practice: {
    displayName: string
    address: {
      line1?: string
      line2?: string
      city: string
      state?: string
      pincode?: string
      geoLocation?: { type: 'Point'; coordinates: number[] }
    }
    phone?: string
    operatingHours: Array<{
      dayOfWeek: number
      morningSlot?: { start?: string; end?: string }
      eveningSlot?: { start?: string; end?: string }
    }>
    consultationFee?: number
    logoUrl?: string
    signatureUrl?: string
  }
  hospitalAffiliations: string[]
  verification: {
    nmcVerified: boolean
    nmcVerifiedAt?: Date
    nmcCertificateUrl?: string
    manualReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_DOCS'
    reviewedBy?: ObjectId
    reviewedAt?: Date
    reviewNotes?: string
  }
  onboarding: {
    method: 'SELF_SIGNUP' | 'ASSISTED_BY_STAFF'
    onboardedBy?: ObjectId
    initialLoginCompleted: boolean
  }
  preferredLabIds: ObjectId[]
  trustLevel: 'VERIFIED' | 'PENDING' | 'REJECTED'
  stats: {
    prescriptionCount: number
    patientCount: number
    averageAiAlignmentRate?: number
  }
  isActive: boolean
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const DoctorSchema = new Schema<IDoctor>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  fullName: { type: String, required: true },
  photoUrl: String,
  nmcRegNumber: { type: String, required: true, unique: true, index: true },
  stateMedicalCouncil: { type: String, required: true },
  hprId: { type: String, sparse: true, index: true },

  specializations: [{
    code: String,
    displayName: { type: String, required: true },
    isPrimary: Boolean,
  }],

  qualifications: [{
    degree: { type: String, required: true },
    institution: String,
    year: Number,
    certificateUrl: String,
  }],

  languages: [String],
  yearsExperience: Number,

  practice: {
    displayName: { type: String, required: true },
    address: {
      line1: String,
      line2: String,
      city: { type: String, required: true, index: true },
      state: String,
      pincode: String,
      geoLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
    },
    phone: String,
    operatingHours: [{
      dayOfWeek: { type: Number, min: 0, max: 6 },
      morningSlot: { start: String, end: String },
      eveningSlot: { start: String, end: String },
    }],
    consultationFee: Number,
    logoUrl: String,
    signatureUrl: String,
  },

  hospitalAffiliations: [String],

  verification: {
    nmcVerified: { type: Boolean, default: false },
    nmcVerifiedAt: Date,
    nmcCertificateUrl: String,
    manualReviewStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_DOCS'],
      default: 'PENDING',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
  },

  onboarding: {
    method: { type: String, enum: ['SELF_SIGNUP', 'ASSISTED_BY_STAFF'], default: 'SELF_SIGNUP' },
    onboardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    initialLoginCompleted: { type: Boolean, default: false },
  },

  preferredLabIds: [{ type: Schema.Types.ObjectId, ref: 'Lab' }],

  trustLevel: {
    type: String,
    enum: ['VERIFIED', 'PENDING', 'REJECTED'],
    default: 'PENDING',
    index: true,
  },

  stats: {
    prescriptionCount: { type: Number, default: 0 },
    patientCount: { type: Number, default: 0 },
    averageAiAlignmentRate: Number,
  },

  isActive: { type: Boolean, default: true },
  deletedAt: Date,
}, { timestamps: true })

DoctorSchema.index({ nmcRegNumber: 1 })
DoctorSchema.index({ 'practice.address.city': 1 })
DoctorSchema.index({ 'practice.address.geoLocation': '2dsphere' })
DoctorSchema.index({ trustLevel: 1 })

export const Doctor = mongoose.model<IDoctor>('Doctor', DoctorSchema)
