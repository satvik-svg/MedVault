import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IPrescription extends Document {
  patientId: ObjectId
  doctorId?: ObjectId
  visitId?: ObjectId
  prescriptionNumber?: string
  source: 'MEDVAULT_NATIVE' | 'EXTERNAL_OCR' | 'EXTERNAL_MANUAL_ENTRY'
  status: 'DRAFT' | 'ISSUED' | 'EXPIRED' | 'REVOKED'
  diagnosis: Array<{
    icd10Code: string
    displayName?: string
    notes?: string
    isPrimary?: boolean
  }>
  medications: Array<{
    rxnormCui: string
    genericName: string
    brandName?: string
    strength?: string
    form?: 'TABLET' | 'CAPSULE' | 'SYRUP' | 'INJECTION' | 'OINTMENT' | 'DROPS' | 'INHALER'
    route?: 'ORAL' | 'IV' | 'IM' | 'SUBLINGUAL' | 'TOPICAL' | 'INHALED' | 'OPHTHALMIC'
    dosage: {
      frequency?: 'ONCE_DAILY' | 'TWICE_DAILY' | 'THRICE_DAILY' | 'FOUR_TIMES_DAILY' | 'EVERY_4H' | 'EVERY_6H' | 'EVERY_8H' | 'AS_NEEDED' | 'WEEKLY' | 'CUSTOM'
      timing?: string[]
      duration?: {
        value?: number
        unit?: 'DAYS' | 'WEEKS' | 'MONTHS'
      }
      totalQuantity?: number
      customInstructions?: string
    }
    notes?: string
    safetyChecks?: Record<string, unknown>
  }>
  drugs?: Array<{
    rxnormCui?: string
    displayName: string
    genericName?: string
    dosage: string
    frequency: string
    duration: string
    route: string
    instructions?: string
    quantity?: number
    refills?: number
  }>
  diagnosisText?: string
  notes?: string
  labOrders: Array<{
    loincCode?: string
    displayName?: string
    priority?: 'ROUTINE' | 'URGENT' | 'STAT'
    fastingRequired?: boolean
    notes?: string
  }>
  followUp?: {
    type?: 'NONE' | 'IN_PERSON' | 'TELEMEDICINE' | 'AS_NEEDED'
    afterValue?: number
    afterUnit?: 'DAYS' | 'WEEKS' | 'MONTHS'
    notes?: string
  }
  pdfUrl?: string
  verificationQR?: {
    url?: string
    imageUrl?: string
  }
  blockchain?: {
    status?: 'NOT_QUEUED' | 'QUEUED' | 'PENDING' | 'ANCHORED' | 'FAILED'
    contentHash?: string
    txHash?: string
    blockNumber?: number
    anchoredAt?: Date
    failureReason?: string
    failedAt?: Date
  }
  aiAssistance?: {
    usedPreVisitDiagnosisSuggestion?: boolean
    selectedFromAiSuggestion?: boolean
    aiSuggestionRank?: number
    doctorOverrideRedFlag?: boolean
    doctorOverrideReason?: string
  }
  validUntil?: Date
  isExpired: boolean
  externalUpload?: {
    uploadedByPatient?: boolean
    uploadedAt?: Date
    ocrConfidence?: number
    verifiedByPatient?: boolean
    verifiedAt?: Date
  }
  attachmentUrls?: string[]
  blockchainTxHash?: string
  issuedAt?: Date
  expiresAt?: Date
  deletedAt?: Date
  voidedAt?: Date
  voidReason?: string
  createdAt: Date
  updatedAt: Date
}

const PrescriptionSchema = new Schema<IPrescription>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', index: true },
  visitId: { type: Schema.Types.ObjectId, ref: 'Visit', index: true },
  prescriptionNumber: { type: String, unique: true, sparse: true, index: true },
  source: {
    type: String,
    enum: ['MEDVAULT_NATIVE', 'EXTERNAL_OCR', 'EXTERNAL_MANUAL_ENTRY'],
    default: 'MEDVAULT_NATIVE',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ISSUED', 'EXPIRED', 'REVOKED'],
    default: 'ISSUED',
    index: true,
  },
  diagnosis: [{
    icd10Code: { type: String, required: true },
    displayName: String,
    notes: String,
    isPrimary: Boolean,
  }],
  medications: [{
    rxnormCui: { type: String, required: true },
    genericName: { type: String, required: true },
    brandName: String,
    strength: String,
    form: { type: String, enum: ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER'] },
    route: { type: String, enum: ['ORAL', 'IV', 'IM', 'SUBLINGUAL', 'TOPICAL', 'INHALED', 'OPHTHALMIC'] },
    dosage: {
      frequency: { type: String, enum: ['ONCE_DAILY', 'TWICE_DAILY', 'THRICE_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_4H', 'EVERY_6H', 'EVERY_8H', 'AS_NEEDED', 'WEEKLY', 'CUSTOM'] },
      timing: [String],
      duration: {
        value: Number,
        unit: { type: String, enum: ['DAYS', 'WEEKS', 'MONTHS'] },
      },
      totalQuantity: Number,
      customInstructions: String,
    },
    notes: String,
    safetyChecks: Schema.Types.Mixed,
  }],
  drugs: [{
    rxnormCui: String,
    displayName: { type: String, required: true },
    genericName: String,
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    route: { type: String, required: true },
    instructions: String,
    quantity: Number,
    refills: Number,
  }],
  diagnosisText: String,
  notes: String,
  labOrders: [{
    loincCode: String,
    displayName: String,
    priority: { type: String, enum: ['ROUTINE', 'URGENT', 'STAT'] },
    fastingRequired: Boolean,
    notes: String,
  }],
  followUp: {
    type: { type: String, enum: ['NONE', 'IN_PERSON', 'TELEMEDICINE', 'AS_NEEDED'] },
    afterValue: Number,
    afterUnit: { type: String, enum: ['DAYS', 'WEEKS', 'MONTHS'] },
    notes: String,
  },
  pdfUrl: String,
  verificationQR: {
    url: String,
    imageUrl: String,
  },
  blockchain: {
    status: {
      type: String,
      enum: ['NOT_QUEUED', 'QUEUED', 'PENDING', 'ANCHORED', 'FAILED'],
      default: 'NOT_QUEUED',
      index: true,
    },
    contentHash: String,
    txHash: String,
    blockNumber: Number,
    anchoredAt: Date,
    failureReason: String,
    failedAt: Date,
  },
  aiAssistance: {
    usedPreVisitDiagnosisSuggestion: Boolean,
    selectedFromAiSuggestion: Boolean,
    aiSuggestionRank: Number,
    doctorOverrideRedFlag: Boolean,
    doctorOverrideReason: String,
  },
  validUntil: Date,
  isExpired: { type: Boolean, default: false },
  externalUpload: {
    uploadedByPatient: Boolean,
    uploadedAt: Date,
    ocrConfidence: Number,
    verifiedByPatient: Boolean,
    verifiedAt: Date,
  },
  attachmentUrls: [String],
  blockchainTxHash: String,
  issuedAt: Date,
  expiresAt: Date,
  deletedAt: Date,
  voidedAt: Date,
  voidReason: String,
}, { timestamps: true })

PrescriptionSchema.index({ blockchainTxHash: 1 }, { sparse: true })
PrescriptionSchema.index({ patientId: 1, createdAt: -1 })
PrescriptionSchema.index({ doctorId: 1, createdAt: -1 })
PrescriptionSchema.index({ visitId: 1 })
PrescriptionSchema.index({ source: 1 })

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema)
