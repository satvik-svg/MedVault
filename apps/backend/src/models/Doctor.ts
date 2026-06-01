import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IDoctor extends Document {
  userId: ObjectId
  fullName: string
  nmcRegNumber: string
  stateMedicalCouncil: string
  hprId?: string
  specializations: Array<{
    code: string
    displayName: string
    isPrimary?: boolean
  }>
  qualifications: Array<{
    degree: string
    institution: string
    year: number
    certificateUrl?: string
  }>
  verification: {
    nmcVerified: boolean
    nmcVerifiedAt?: Date
    nmcVerificationMethod: 'AUTO_API' | 'MANUAL_DOCUMENT_REVIEW'
    documentsReviewed: boolean
    reviewedBy?: ObjectId
    reviewedAt?: Date
    reviewNotes?: string
  }
  affiliations: Array<{
    clinicId: ObjectId
    role: 'CONSULTANT' | 'RESIDENT' | 'VISITING' | 'OWNER'
    confirmedByClinic: boolean
    confirmedByDoctor: boolean
    activeSince?: Date
    isActive: boolean
  }>
  trustLevel: 'TIER_1_FULL' | 'TIER_2_INDEPENDENT' | 'TIER_3_PENDING' | 'TIER_4_REJECTED'
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
  nmcRegNumber: { type: String, required: true, unique: true, index: true },
  stateMedicalCouncil: { type: String, required: true },
  hprId: { type: String, sparse: true, index: true },

  specializations: [{
    code: String,
    displayName: String,
    isPrimary: Boolean,
  }],

  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    certificateUrl: String,
  }],

  verification: {
    nmcVerified: { type: Boolean, default: false },
    nmcVerifiedAt: Date,
    nmcVerificationMethod: { type: String, enum: ['AUTO_API', 'MANUAL_DOCUMENT_REVIEW'] },
    documentsReviewed: { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
  },

  affiliations: [{
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true },
    role: { type: String, enum: ['CONSULTANT', 'RESIDENT', 'VISITING', 'OWNER'] },
    confirmedByClinic: { type: Boolean, default: false },
    confirmedByDoctor: { type: Boolean, default: false },
    activeSince: Date,
    isActive: { type: Boolean, default: true },
  }],

  trustLevel: {
    type: String,
    enum: ['TIER_1_FULL', 'TIER_2_INDEPENDENT', 'TIER_3_PENDING', 'TIER_4_REJECTED'],
    default: 'TIER_3_PENDING',
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
DoctorSchema.index({ 'affiliations.clinicId': 1, 'affiliations.isActive': 1 })
DoctorSchema.index({ trustLevel: 1 })

export const Doctor = mongoose.model<IDoctor>('Doctor', DoctorSchema)
