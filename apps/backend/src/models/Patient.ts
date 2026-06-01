import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IPatient extends Document {
  userId: ObjectId
  medvaultId: string
  abhaId?: string
  abhaAddress?: string
  fullName: string
  dateOfBirth: Date
  sex: 'M' | 'F' | 'O'
  bloodGroup?: string
  contact: {
    primaryPhone: string
    alternatePhone?: string
    email?: string
    address: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      pincode?: string
    }
  }
  allergies: Array<{
    allergen: string
    type: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER'
    severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'ANAPHYLACTIC'
    reaction?: string
    notedAt?: Date
    notedBy?: ObjectId
  }>
  chronicConditions: Array<{
    icd10Code: string
    displayName?: string
    diagnosedAt?: Date
    diagnosedBy?: ObjectId
    status: 'ACTIVE' | 'RESOLVED' | 'IN_REMISSION'
  }>
  activeMedications: Array<{
    prescriptionId?: ObjectId
    rxnormCui?: string
    displayName: string
    genericName?: string
    strength?: string
    drugClass?: string
    startedAt?: Date
    expectedEndAt?: Date
  }>
  emergencyContact: {
    name?: string
    relationship?: string
    phone?: string
  }
  activeEmergencyQrNonces: string[]
  lastKnownLocation?: {
    lat: number
    lng: number
    city?: string
    country?: string
    capturedAt: Date
  }
  stats: {
    totalVisits: number
    lastVisitAt?: Date
    averageAiConfidence?: number
    adherenceScore?: 'GOOD' | 'MODERATE' | 'POOR'
  }
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PatientSchema = new Schema<IPatient>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  medvaultId: { type: String, required: true, unique: true, index: true },
  abhaId: { type: String, unique: true, sparse: true, index: true },
  abhaAddress: String,

  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  sex: { type: String, enum: ['M', 'F', 'O'], required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'] },

  contact: {
    primaryPhone: String,
    alternatePhone: String,
    email: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },
  },

  allergies: [{
    allergen: { type: String, required: true },
    type: { type: String, enum: ['DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER'] },
    severity: { type: String, enum: ['MILD', 'MODERATE', 'SEVERE', 'ANAPHYLACTIC'] },
    reaction: String,
    notedAt: Date,
    notedBy: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  }],

  chronicConditions: [{
    icd10Code: { type: String, required: true },
    displayName: String,
    diagnosedAt: Date,
    diagnosedBy: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    status: { type: String, enum: ['ACTIVE', 'RESOLVED', 'IN_REMISSION'] },
  }],

  activeMedications: [{
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    rxnormCui: String,
    displayName: String,
    genericName: String,
    strength: String,
    drugClass: String,
    startedAt: Date,
    expectedEndAt: Date,
  }],

  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
  },

  activeEmergencyQrNonces: [String],
  lastKnownLocation: {
    lat: Number,
    lng: Number,
    city: String,
    country: String,
    capturedAt: Date,
  },

  stats: {
    totalVisits: { type: Number, default: 0 },
    lastVisitAt: Date,
    averageAiConfidence: Number,
    adherenceScore: { type: String, enum: ['GOOD', 'MODERATE', 'POOR'] },
  },

  deletedAt: Date,
}, { timestamps: true })

PatientSchema.index({ medvaultId: 1 })
PatientSchema.index({ abhaId: 1 })
PatientSchema.index({ 'allergies.allergen': 1 })

export const Patient = mongoose.model<IPatient>('Patient', PatientSchema)
