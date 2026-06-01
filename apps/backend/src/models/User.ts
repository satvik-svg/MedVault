import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export interface IUser extends Document {
  phoneNumber: string
  email?: string
  passwordHash?: string
  role: 'PATIENT' | 'DOCTOR' | 'CLINIC_ADMIN' | 'LAB_OPERATOR' | 'PHARMACY_OPERATOR' | 'PLATFORM_ADMIN'
  patientId?: ObjectId
  doctorId?: ObjectId
  clinicId?: ObjectId
  isPhoneVerified: boolean
  isEmailVerified: boolean
  isActive: boolean
  isLocked: boolean
  lastLoginAt?: Date
  failedLoginAttempts: number
  twoFactorEnabled: boolean
  twoFactorSecret?: string
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  email: { type: String, unique: true, sparse: true, index: true },
  passwordHash: { type: String },

  role: {
    type: String,
    enum: ['PATIENT', 'DOCTOR', 'CLINIC_ADMIN', 'LAB_OPERATOR', 'PHARMACY_OPERATOR', 'PLATFORM_ADMIN'],
    required: true,
    index: true,
  },

  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },

  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },

  lastLoginAt: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,

  deletedAt: Date,
}, { timestamps: true })

UserSchema.index({ role: 1, isActive: 1 })

export const User = mongoose.model<IUser>('User', UserSchema)
