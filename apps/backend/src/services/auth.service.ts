import bcrypt from 'bcrypt'
import { User } from '../models/User.ts'
import { Patient } from '../models/Patient.ts'
import { Doctor } from '../models/Doctor.ts'
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
      labId: existingUser.labId?.toString(),
    }
    const accessToken = issueAccessToken(accessPayload)
    const refreshToken = issueRefreshToken(existingUser._id.toString(), tokenId)
    await redis.setex(`refresh:${existingUser._id}:${tokenId}`, 30 * 24 * 3600, '1')

    existingUser.isPhoneVerified = true
    existingUser.lastLoginAt = new Date()
    await existingUser.save()

    return { accessToken, refreshToken, user: { id: existingUser._id, role: existingUser.role } }
  }

  const user = await User.create({
    phoneNumber,
    role: 'PATIENT',
    isPhoneVerified: true,
  })

  const medvaultId = generateMedvaultId()
  const patient = await Patient.create({
    userId: user._id,
    medvaultId,
    fullName: '',
    dateOfBirth: new Date(),
    sex: 'O',
  })

  await User.updateOne({ _id: user._id }, { patientId: patient._id })

  const tokenId = generateTokenId()
  const accessToken = issueAccessToken({
    userId: user._id.toString(),
    role: 'PATIENT',
    patientId: patient._id.toString(),
  })
  const refreshToken = issueRefreshToken(user._id.toString(), tokenId)
  await redis.setex(`refresh:${user._id}:${tokenId}`, 30 * 24 * 3600, '1')

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, role: 'PATIENT', patientId: patient._id, medvaultId },
  }
}

// ─── Doctor Signup ──────────────────────────────────────────────────────────

export async function doctorSignup(
  data: {
    phoneNumber: string
    email: string
    password: string
    fullName: string
    nmcRegNumber: string
    stateMedicalCouncil: string
    practice?: {
      displayName?: string
      address?: { city?: string; line1?: string; line2?: string; state?: string; pincode?: string }
      phone?: string
      consultationFee?: number
    }
    specializations?: Array<{ code: string; displayName: string; isPrimary?: boolean }>
    qualifications?: Array<{ degree: string; institution: string; year: number }>
  }
): Promise<{ accessToken: string; refreshToken: string }> {
  const existingUser = await User.findOne({
    $or: [{ phoneNumber: data.phoneNumber }, { email: data.email }],
  })
  if (existingUser) throw new Error('Phone number or email already registered')

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await User.create({
    phoneNumber: data.phoneNumber,
    email: data.email,
    passwordHash,
    role: 'DOCTOR',
    isPhoneVerified: false,
    isEmailVerified: false,
  })

  const doctor = await Doctor.create({
    userId: user._id,
    fullName: data.fullName,
    nmcRegNumber: data.nmcRegNumber,
    stateMedicalCouncil: data.stateMedicalCouncil,
    specializations: data.specializations || [],
    qualifications: data.qualifications || [],
    practice: {
      displayName: data.practice?.displayName || `${data.fullName}'s Practice`,
      address: {
        city: data.practice?.address?.city || 'UNKNOWN',
        line1: data.practice?.address?.line1,
        line2: data.practice?.address?.line2,
        state: data.practice?.address?.state,
        pincode: data.practice?.address?.pincode,
      },
      phone: data.practice?.phone || data.phoneNumber,
      consultationFee: data.practice?.consultationFee,
      operatingHours: [],
    },
    onboarding: { method: 'SELF_SIGNUP', initialLoginCompleted: false },
  })

  await User.updateOne({ _id: user._id }, { doctorId: doctor._id })

  const tokenId = generateTokenId()
  const accessToken = issueAccessToken({
    userId: user._id.toString(),
    role: 'DOCTOR',
    doctorId: doctor._id.toString(),
    trustLevel: 'PENDING',
  })
  const refreshToken = issueRefreshToken(user._id.toString(), tokenId)
  await redis.setex(`refresh:${user._id}:${tokenId}`, 30 * 24 * 3600, '1')

  return { accessToken, refreshToken }
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
    labId: user.labId?.toString(),
  }
  const accessToken = issueAccessToken(accessPayload)
  const refreshToken = issueRefreshToken(user._id.toString(), tokenId)
  await redis.setex(`refresh:${user._id}:${tokenId}`, 30 * 24 * 3600, '1')

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, role: user.role, email: user.email, mustChangePassword: user.mustChangePassword },
  }
}

// ─── Refresh ────────────────────────────────────────────────────────────────

export async function completeFirstTimeLogin(
  email: string,
  tempPassword: string,
  newPassword: string
): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {
  const user = await User.findOne({ email, deletedAt: { $exists: false } })
  if (!user || !user.passwordHash) throw new Error('Invalid credentials')
  if (!user.mustChangePassword) throw new Error('First-time password change is not required')

  const valid = await bcrypt.compare(tempPassword, user.passwordHash)
  if (!valid) throw new Error('Invalid credentials')

  user.passwordHash = await bcrypt.hash(newPassword, 12)
  user.mustChangePassword = false
  user.isPhoneVerified = true
  user.lastLoginAt = new Date()
  await user.save()

  const tokenId = generateTokenId()
  const accessPayload: AccessTokenPayload = {
    userId: user._id.toString(),
    role: user.role,
    patientId: user.patientId?.toString(),
    doctorId: user.doctorId?.toString(),
    labId: user.labId?.toString(),
  }
  const accessToken = issueAccessToken(accessPayload)
  const refreshToken = issueRefreshToken(user._id.toString(), tokenId)
  await redis.setex(`refresh:${user._id}:${tokenId}`, 30 * 24 * 3600, '1')

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, role: user.role, email: user.email, mustChangePassword: false },
  }
}

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
    labId: user.labId?.toString(),
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
