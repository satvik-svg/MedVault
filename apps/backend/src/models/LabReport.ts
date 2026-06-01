import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface ILabReport extends Document {
  patientId: ObjectId
  uploadedByUserId?: ObjectId
  labId?: ObjectId
  labOrderId?: ObjectId
  uploadedByOperatorUserId?: ObjectId
  orderedByDoctorId?: ObjectId
  prescriptionId?: ObjectId
  reportNumber?: string
  source: 'MEDVAULT_NATIVE_LAB_PARTNER' | 'MEDVAULT_NATIVE_DOCTOR_ENTRY' | 'EXTERNAL_OCR' | 'EXTERNAL_MANUAL'
  fileUrl?: string
  fileType?: string
  collectionDate?: Date
  reportDate: Date
  category?: string
  results: Array<{
    loincCode?: string
    testName: string
    value?: unknown
    unit?: string
    referenceRange?: {
      low?: number
      high?: number
      textual?: string
    }
    flag?: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH' | 'ABNORMAL'
    notes?: string
  }>
  hasAbnormalValues: boolean
  hasCriticalValues: boolean
  attachmentUrls: string[]
  ocrText?: string
  structuredData?: Record<string, unknown>
  aiConfidence?: number
  isVerified: boolean
  verifiedBy?: ObjectId
  externalUpload?: {
    uploadedByPatient?: boolean
    uploadedAt?: Date
    ocrConfidence?: number
    verifiedByLab?: boolean
  }
  blockchain?: {
    status?: 'NOT_QUEUED' | 'QUEUED' | 'PENDING' | 'ANCHORED' | 'FAILED'
    contentHash?: string
    txHash?: string
    blockNumber?: number
    anchoredAt?: Date
  }
  blockchainTxHash?: string
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LabReportSchema = new Schema<ILabReport>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  uploadedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', index: true },
  labOrderId: { type: Schema.Types.ObjectId, ref: 'LabOrder', index: true },
  uploadedByOperatorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  orderedByDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
  reportNumber: { type: String, unique: true, sparse: true },
  source: { type: String, enum: ['MEDVAULT_NATIVE_LAB_PARTNER', 'MEDVAULT_NATIVE_DOCTOR_ENTRY', 'EXTERNAL_OCR', 'EXTERNAL_MANUAL'], default: 'MEDVAULT_NATIVE_LAB_PARTNER' },
  fileUrl: String,
  fileType: String,
  collectionDate: Date,
  reportDate: { type: Date, required: true },
  category: String,
  results: [{
    loincCode: String,
    testName: { type: String, required: true },
    value: Schema.Types.Mixed,
    unit: String,
    referenceRange: {
      low: Number,
      high: Number,
      textual: String,
    },
    flag: { type: String, enum: ['NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH', 'ABNORMAL'] },
    notes: String,
  }],
  hasAbnormalValues: { type: Boolean, default: false },
  hasCriticalValues: { type: Boolean, default: false },
  attachmentUrls: [String],
  ocrText: String,
  structuredData: Schema.Types.Mixed,
  aiConfidence: Number,
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  externalUpload: {
    uploadedByPatient: Boolean,
    uploadedAt: Date,
    ocrConfidence: Number,
    verifiedByLab: Boolean,
  },
  blockchain: {
    status: { type: String, enum: ['NOT_QUEUED', 'QUEUED', 'PENDING', 'ANCHORED', 'FAILED'], default: 'NOT_QUEUED' },
    contentHash: String,
    txHash: String,
    blockNumber: Number,
    anchoredAt: Date,
  },
  blockchainTxHash: String,
  deletedAt: Date,
}, { timestamps: true })

LabReportSchema.index({ patientId: 1, reportDate: -1 })
LabReportSchema.index({ labId: 1, reportDate: -1 })

export const LabReport = mongoose.model<ILabReport>('LabReport', LabReportSchema)
