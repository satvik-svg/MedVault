import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { User } from '../models/User.ts'
import { Patient } from '../models/Patient.ts'
import { Doctor } from '../models/Doctor.ts'
import { Clinic } from '../models/Clinic.ts'
import { redis } from '../config/redis.ts'
import {
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from '../utils/jwt.ts'
import { generateMedvaultId, generateTokenId } from '../utils/helpers.ts'

// ─── Patient OTP Flow ───────────────────────────────────────────────────────

export async function patientSignup(phoneNumber: string): Promise<void> {
  if (!/^\+91[6-9]\d{9}$/.test(phoneNumber)) {
    throw new Error('Invalid Indian phone number format')
  }

  const otpAttempts = await redis.incr(`otp:attempts:${phoneNumber}`)
  await redis.expire(`otp:attempts:${phoneNumber}`, 3600)
  if (otpAttempts > 5) throw new Error('Too many OTP requests. Try again in an hour.')

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const hashedOtp = await bcrypt.hash(otp, 10)
  await redis.setex(`otp:${phoneNumber}`, 300, hashedOtp)

  // In production, send via Twilio
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV OTP] ${phoneNumber}: ${otp}`)
  } else {
    const twilio = await import('twilio')
    const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${phoneNumber}`,
      body: `Your MedVault OTP is ${otp}. Valid for 5 minutes.`,
    })
  }
}

export async function verifyOtpAndCreatePatient(
  phoneNumber: string,
  otp: string
): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {
  const hashedOtp = await redis.get(`otp:${phoneNumber}`)
  if (!hashedOtp || !(await bcrypt.compare(otp, hashedOtp))) {
    throw new Error('Invalid or expired OTP')
  }
  await redis.del(`otp:${phoneNumber}`)

  const existingUser = await User.findOne({ phoneNumber })
  if (existingUser) {
    const tokenId = generateTokenId()
    const accessPayload: AccessTokenPayload = {
      userId: existingUser._id.toString(),
      role: existingUser.role,
      patientId: existingUser.patientId?.toString(),
      doctorId: existingUser.doctorId?.toString(),
      clinicId: existingUser.clinicId?.toString(),
    }
    const accessToken = issueAccessToken(accessPayload)
    const refreshToken = issueRefreshToken(existingUser._id.toString(), tokenId)
    await redis.setex(`refresh:${existingUser._id}:${tokenId}`, 30 * 24 * 3600, '1')

    existingUser.isPhoneVerified = true
    existingUser.lastLoginAt = new Date()
    await existingUser.save()

    return { accessToken, refreshToken, user: { id: existingUser._id, role: existingUser.role } }
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const user = await User.create([{
      phoneNumber,
      role: 'PATIENT',
      isPhoneVerified: true,
    }], { session })

    const medvaultId = generateMedvaultId()
    const patient = await Patient.create([{
      userId: user[0]._id,
      medvaultId,
      fullName: '',
      dateOfBirth: new Date(),
      sex: 'O',
    }], { session })

    await User.updateOne({ _id: user[0]._id }, { patientId: patient[0]._id }, { session })

    await session.commitTransaction()

    const tokenId = generateTokenId()
    const accessToken = issueAccessToken({
      userId: user[0]._id.toString(),
      role: 'PATIENT',
      patientId: patient[0]._id.toString(),
    })
    const refreshToken = issueRefreshToken(user[0]._id.toString(), tokenId)
    await redis.setex(`refresh:${user[0]._id}:${tokenId}`, 30 * 24 * 3600, '1')

    return {
      accessToken,
      refreshToken,
      user: { id: user[0]._id, role: 'PATIENT', patientId: patient[0]._id, medvaultId },
    }
  } catch (e) {
    await session.abortTransaction()
    throw e
  } finally {
    session.endSession()
  }
}

// ─── Doctor/Clinic Signup ───────────────────────────────────────────────────

export async function doctorSignup(
  data: {
    phoneNumber: string
    email: string
    password: string
    fullName: string
    nmcRegNumber: string
    stateMedicalCouncil: string
    specializations?: Array<{ code: string; displayName: string; isPrimary?: boolean }>
    qualifications?: Array<{ degree: string; institution: string; year: number }>
  }
): Promise<{ accessToken: string; refreshToken: string }> {
  const existingUser = await User.findOne({
    $or: [{ phoneNumber: data.phoneNumber }, { email: data.email }],
  })
  if (existingUser) throw new Error('Phone number or email already registered')

  const passwordHash = await bcrypt.hash(data.password, 12)

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const user = await User.create([{
      phoneNumber: data.phoneNumber,
      email: data.email,
      passwordHash,
      role: 'DOCTOR',
      isPhoneVerified: false,
      isEmailVerified: false,
    }], { session })

    const doctor = await Doctor.create([{
      userId: user[0]._id,
      fullName: data.fullName,
      nmcRegNumber: data.nmcRegNumber,
      stateMedicalCouncil: data.stateMedicalCouncil,
      specializations: data.specializations || [],
      qualifications: data.qualifications || [],
    }], { session })

    await User.updateOne({ _id: user[0]._id }, { doctorId: doctor[0]._id }, { session })

    await session.commitTransaction()

    const tokenId = generateTokenId()
    const accessToken = issueAccessToken({
      userId: user[0]._id.toString(),
      role: 'DOCTOR',
      doctorId: doctor[0]._id.toString(),
      trustLevel: 'TIER_3_PENDING',
    })
    const refreshToken = issueRefreshToken(user[0]._id.toString(), tokenId)
    await redis.setex(`refresh:${user[0]._id}:${tokenId}`, 30 * 24 * 3600, '1')

    return { accessToken, refreshToken }
  } catch (e) {
    await session.abortTransaction()
    throw e
  } finally {
    session.endSession()
  }
}

export async function clinicSignup(
  data: {
    phoneNumber: string
    email: string
    password: string
    legalName: string
    displayName: string
    type: string
    hfrId?: string
    gstin?: string
  }
): Promise<{ accessToken: string; refreshToken: string }> {
  const existingUser = await User.findOne({
    $or: [{ phoneNumber: data.phoneNumber }, { email: data.email }],
  })
  if (existingUser) throw new Error('Phone number or email already registered')

  const passwordHash = await bcrypt.hash(data.password, 12)

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const user = await User.create([{
      phoneNumber: data.phoneNumber,
      email: data.email,
      passwordHash,
      role: 'CLINIC_ADMIN',
      isPhoneVerified: false,
      isEmailVerified: false,
    }], { session })

    const clinic = await Clinic.create([{
      legalName: data.legalName,
      displayName: data.displayName,
      type: data.type,
      hfrId: data.hfrId,
      gstin: data.gstin,
      adminUserIds: [user[0]._id],
    }], { session })

    await User.updateOne({ _id: user[0]._id }, { clinicId: clinic[0]._id }, { session })

    await session.commitTransaction()

    const tokenId = generateTokenId()
    const accessToken = issueAccessToken({
      userId: user[0]._id.toString(),
      role: 'CLINIC_ADMIN',
      clinicId: clinic[0]._id.toString(),
      trustLevel: 'TIER_3_UNVERIFIED',
    })
    const refreshToken = issueRefreshToken(user[0]._id.toString(), tokenId)
    await redis.setex(`refresh:${user[0]._id}:${tokenId}`, 30 * 24 * 3600, '1')

    return { accessToken, refreshToken }
  } catch (e) {
    await session.abortTransaction()
    throw e
  } finally {
    session.endSession()
  }
}

// ─── Login ──────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {
  const user = await User.findOne({ email, deletedAt: { $exists: false } })
  if (!user || !user.passwordHash) throw new Error('Invalid credentials')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    user.failedLoginAttempts += 1
    if (user.failedLoginAttempts >= 5) {
      user.isLocked = true
    }
    await user.save()
    throw new Error('Invalid credentials')
  }

  if (user.isLocked) throw new Error('Account is locked. Contact support.')

  user.failedLoginAttempts = 0
  user.lastLoginAt = new Date()
  await user.save()

  const tokenId = generateTokenId()
  const accessPayload: AccessTokenPayload = {
    userId: user._id.toString(),
    role: user.role,
    patientId: user.patientId?.toString(),
    doctorId: user.doctorId?.toString(),
    clinicId: user.clinicId?.toString(),
  }
  const accessToken = issueAccessToken(accessPayload)
  const refreshToken = issueRefreshToken(user._id.toString(), tokenId)
  await redis.setex(`refresh:${user._id}:${tokenId}`, 30 * 24 * 3600, '1')

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, role: user.role, email: user.email },
  }
}

// ─── Refresh ────────────────────────────────────────────────────────────────

export async function refreshTokens(
  oldRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const { userId, tokenId } = verifyRefreshToken(oldRefreshToken)
  const exists = await redis.get(`refresh:${userId}:${tokenId}`)
  if (!exists) throw new Error('Refresh token revoked')

  await redis.del(`refresh:${userId}:${tokenId}`)

  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const newTokenId = generateTokenId()
  const accessPayload: AccessTokenPayload = {
    userId: user._id.toString(),
    role: user.role,
    patientId: user.patientId?.toString(),
    doctorId: user.doctorId?.toString(),
    clinicId: user.clinicId?.toString(),
  }
  const accessToken = issueAccessToken(accessPayload)
  const refreshToken = issueRefreshToken(user._id.toString(), newTokenId)
  await redis.setex(`refresh:${user._id}:${newTokenId}`, 30 * 24 * 3600, '1')

  return { accessToken, refreshToken }
}

// ─── Logout ─────────────────────────────────────────────────────────────────

export async function logout(refreshToken: string): Promise<void> {
  try {
    const { userId, tokenId } = verifyRefreshToken(refreshToken)
    await redis.del(`refresh:${userId}:${tokenId}`)
  } catch {
    // Token already expired or invalid; nothing to do
  }
}
