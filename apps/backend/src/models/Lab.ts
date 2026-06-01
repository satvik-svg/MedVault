import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface ILab extends Document {
  legalName: string
  displayName: string
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
  gstin?: string
  nablAccreditationNumber?: string
  tradeLicenseUrl?: string
  premisesPhotoUrl?: string
  address: {
    line1?: string
    line2?: string
    city: string
    state?: string
    pincode?: string
    geoLocation?: { type: 'Point'; coordinates: number[] }
  }
  operatingHours: Array<{ dayOfWeek: number; open?: string; close?: string; isClosed: boolean }>
  sampleCollectionHours: Array<{ dayOfWeek: number; open?: string; close?: string }>
  holidayDates: Date[]
  homeCollectionAvailable: boolean
  homeCollectionCharge?: number
  homeCollectionCities: string[]
  testsOffered: Array<{
    loincCode?: string
    displayName: string
    price?: number
    tatHours?: number
    sampleType?: string
    fastingRequired?: boolean
    requiresPrescription: boolean
  }>
  operatorUserIds: ObjectId[]
  verification: {
    nablVerified: boolean
    tradeLicenseVerified: boolean
    manualReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_DOCS'
    reviewedBy?: ObjectId
    reviewedAt?: Date
    reviewNotes?: string
  }
  trustLevel: 'VERIFIED' | 'PENDING' | 'REJECTED'
  onboarding: {
    method: 'SELF_SIGNUP' | 'ASSISTED_BY_STAFF'
    onboardedBy?: ObjectId
    initialLoginCompleted: boolean
  }
  stats: {
    totalOrdersReceived: number
    totalReportsUploaded: number
    avgTurnaroundHours?: number
    onTimeRate?: number
  }
  commercial: {
    isCommercialActive: boolean
    commissionRatePercent?: number
    bankAccount?: {
      accountHolderName?: string
      accountNumber?: string
      ifsc?: string
      bankName?: string
    }
  }
  isActive: boolean
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LabSchema = new Schema<ILab>({
  legalName: { type: String, required: true },
  displayName: { type: String, required: true },
  phone: String,
  email: String,
  website: String,
  logoUrl: String,

  gstin: { type: String, unique: true, sparse: true },
  nablAccreditationNumber: { type: String, unique: true, sparse: true },
  tradeLicenseUrl: String,
  premisesPhotoUrl: String,

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

  operatingHours: [{
    dayOfWeek: { type: Number, min: 0, max: 6 },
    open: String,
    close: String,
    isClosed: { type: Boolean, default: false },
  }],
  sampleCollectionHours: [{
    dayOfWeek: { type: Number, min: 0, max: 6 },
    open: String,
    close: String,
  }],
  holidayDates: [Date],

  homeCollectionAvailable: { type: Boolean, default: false },
  homeCollectionCharge: Number,
  homeCollectionCities: [String],

  testsOffered: [{
    loincCode: String,
    displayName: { type: String, required: true },
    price: Number,
    tatHours: Number,
    sampleType: String,
    fastingRequired: Boolean,
    requiresPrescription: { type: Boolean, default: true },
  }],

  operatorUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  verification: {
    nablVerified: { type: Boolean, default: false },
    tradeLicenseVerified: { type: Boolean, default: false },
    manualReviewStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_DOCS'],
      default: 'PENDING',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
  },

  trustLevel: {
    type: String,
    enum: ['VERIFIED', 'PENDING', 'REJECTED'],
    default: 'PENDING',
    index: true,
  },

  onboarding: {
    method: { type: String, enum: ['SELF_SIGNUP', 'ASSISTED_BY_STAFF'], default: 'SELF_SIGNUP' },
    onboardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    initialLoginCompleted: { type: Boolean, default: false },
  },

  stats: {
    totalOrdersReceived: { type: Number, default: 0 },
    totalReportsUploaded: { type: Number, default: 0 },
    avgTurnaroundHours: Number,
    onTimeRate: Number,
  },

  commercial: {
    isCommercialActive: { type: Boolean, default: false },
    commissionRatePercent: Number,
    bankAccount: {
      accountHolderName: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },
  },

  isActive: { type: Boolean, default: true },
  deletedAt: Date,
}, { timestamps: true })

LabSchema.index({ 'address.city': 1, isActive: 1, trustLevel: 1 })
LabSchema.index({ 'address.geoLocation': '2dsphere' })
LabSchema.index({ 'testsOffered.loincCode': 1 })

export const Lab = mongoose.model<ILab>('Lab', LabSchema)
