import bcrypt from 'bcrypt'
import { User } from '../models/User.ts'
import { Patient } from '../models/Patient.ts'
import { Doctor } from '../models/Doctor.ts'
import { Lab } from '../models/Lab.ts'
import { redis } from '../config/redis.ts'
import {
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from '../utils/jwt.ts'
import { generateMedvaultId, generateTokenId } from '../utils/helpers.ts'

type SelfRegisterRole = 'patient' | 'doctor' | 'lab'

interface SelfRegisterInput {
  role: SelfRegisterRole
  firstName?: string
  lastName?: string
  fullName?: string
  email: string
  phoneNumber: string
  password: string
  abhaId?: string
  address?: string
  state?: string
  pincode?: string
  specialty?: string
  nmcRegNumber?: string
  stateMedicalCouncil?: string
  labName?: string
}

interface AuthSession {
  accessToken: string
  refreshToken: string
  user: Record<string, unknown>
}

function normalizeEmail(email: string | undefined): string {
  return (email || '').trim().toLowerCase()
}

function normalizePhoneNumber(phoneNumber: string | undefined): string {
  const compact = (phoneNumber || '').replace(/[\s-]/g, '')
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`
  return compact
}

function buildFullName(input: Pick<SelfRegisterInput, 'firstName' | 'lastName' | 'fullName'>): string {
  const fullName = input.fullName?.trim()
  if (fullName) return fullName
  return [input.firstName, input.lastName].map((item) => item?.trim()).filter(Boolean).join(' ')
}

function sanitizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

async function issueSession(user: {
  _id: string
  role: string
  email?: string
  patientId?: string
  doctorId?: string
  labId?: string
  mustChangePassword?: boolean
}): Promise<AuthSession> {
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
    user: {
      id: user._id,
      role: user.role,
      email: user.email,
      patientId: user.patientId,
      doctorId: user.doctorId,
      labId: user.labId,
      mustChangePassword: !!user.mustChangePassword,
    },
  }
}

function assertSelfRegisterInput(input: SelfRegisterInput): void {
  if (!['patient', 'doctor', 'lab'].includes(input.role)) throw new Error('Unsupported registration role')
  if (!normalizeEmail(input.email)) throw new Error('Email is required')
  if (!normalizePhoneNumber(input.phoneNumber)) throw new Error('Phone number is required')
  if (!input.password || input.password.length < 8) throw new Error('Password must be at least 8 characters')
  if (!buildFullName(input) && input.role !== 'lab') throw new Error('Full name is required')
  if (input.role === 'doctor' && !sanitizeOptional(input.nmcRegNumber)) {
    throw new Error('Medical registration number is required')
  }
  if (input.role === 'lab' && !sanitizeOptional(input.labName)) throw new Error('Lab name is required')
}

async function ensureUniqueUser(email: string, phoneNumber: string): Promise<void> {
  const existingUser = await User.findOne({
    $or: [{ phoneNumber }, { email }],
  })
  if (existingUser) throw new Error('Phone number or email already registered')
}

// ─── Email/Password Self Registration ──────────────────────────────────────

export async function registerWithPassword(input: SelfRegisterInput): Promise<AuthSession> {
  assertSelfRegisterInput(input)

  const email = normalizeEmail(input.email)
  const phoneNumber = normalizePhoneNumber(input.phoneNumber)
  const fullName = buildFullName(input)
  const passwordHash = await bcrypt.hash(input.password, 12)

  await ensureUniqueUser(email, phoneNumber)

  if (input.role === 'doctor') {
    const user = await User.create({
      phoneNumber,
      email,
      passwordHash,
      role: 'DOCTOR',
      isPhoneVerified: false,
      isEmailVerified: false,
      isActive: true,
    })

    const doctor = await Doctor.create({
      userId: user._id,
      fullName,
      nmcRegNumber: sanitizeOptional(input.nmcRegNumber),
      stateMedicalCouncil: sanitizeOptional(input.stateMedicalCouncil) || sanitizeOptional(input.state) || 'UNKNOWN',
      specializations: input.specialty ? [{ code: input.specialty, displayName: input.specialty, isPrimary: true }] : [],
      qualifications: [],
      practice: {
        displayName: `${fullName}'s Practice`,
        address: {
          line1: sanitizeOptional(input.address),
          state: sanitizeOptional(input.state),
          pincode: sanitizeOptional(input.pincode),
          city: sanitizeOptional(input.state) || 'UNKNOWN',
        },
        phone: phoneNumber,
        operatingHours: [],
      },
      verification: { manualReviewStatus: 'PENDING' },
      onboarding: { method: 'SELF_SIGNUP', initialLoginCompleted: true },
      trustLevel: 'PENDING',
    })

    await User.updateOne({ _id: user._id }, { doctorId: doctor._id })
    user.doctorId = doctor._id
    return issueSession(user)
  }

  if (input.role === 'lab') {
    const lab = await Lab.create({
      displayName: sanitizeOptional(input.labName),
      phone: phoneNumber,
      email,
      address: {
        line1: sanitizeOptional(input.address),
        state: sanitizeOptional(input.state),
        pincode: sanitizeOptional(input.pincode),
      },
      operatingHours: [],
      testsOffered: [],
      verification: { manualReviewStatus: 'PENDING' },
      onboarding: { method: 'SELF_SIGNUP', initialLoginCompleted: true },
      trustLevel: 'PENDING',
      isActive: true,
    })

    const user = await User.create({
      phoneNumber,
      email,
      passwordHash,
      role: 'LAB_OPERATOR',
      labId: lab._id,
      isPhoneVerified: false,
      isEmailVerified: false,
      isActive: true,
    })

    await Lab.updateOne({ _id: lab._id }, { $set: { operatorUserIds: [user._id] } })
    return issueSession(user)
  }

  const user = await User.create({
    phoneNumber,
    email,
    passwordHash,
    role: 'PATIENT',
    isPhoneVerified: false,
    isEmailVerified: false,
    isActive: true,
  })

  const medvaultId = generateMedvaultId()
  const patient = await Patient.create({
    userId: user._id,
    medvaultId,
    abhaId: sanitizeOptional(input.abhaId),
    fullName,
    dateOfBirth: new Date(),
    sex: 'O',
    contact: { primaryPhone: phoneNumber, email },
    onboarding: { method: 'SELF_SIGNUP', initialLoginCompleted: true },
  })

  await User.updateOne({ _id: user._id }, { patientId: patient._id })
  user.patientId = patient._id
  return issueSession(user)
}

// ─── Patient OTP Flow ───────────────────────────────────────────────────────

export async function patientSignup(phoneNumber: string): Promise<void> {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber)
  if (!/^\+91[6-9]\d{9}$/.test(normalizedPhoneNumber)) {
    throw new Error('Invalid Indian phone number format')
  }

  const otpAttempts = await redis.incr(`otp:attempts:${normalizedPhoneNumber}`)
  await redis.expire(`otp:attempts:${normalizedPhoneNumber}`, 3600)
  if (otpAttempts > 5) throw new Error('Too many OTP requests. Try again in an hour.')

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const hashedOtp = await bcrypt.hash(otp, 10)
  await redis.setex(`otp:${normalizedPhoneNumber}`, 300, hashedOtp)

  // In production, send via Twilio
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV OTP] ${normalizedPhoneNumber}: ${otp}`)
  } else {
    const twilio = await import('twilio')
    const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${normalizedPhoneNumber}`,
      body: `Your MedVault OTP is ${otp}. Valid for 5 minutes.`,
    })
  }
}

export async function verifyOtpAndCreatePatient(
  phoneNumber: string,
  otp: string
): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber)
  const hashedOtp = await redis.get(`otp:${normalizedPhoneNumber}`)
  if (!hashedOtp || !(await bcrypt.compare(otp, hashedOtp))) {
    throw new Error('Invalid or expired OTP')
  }
  await redis.del(`otp:${normalizedPhoneNumber}`)

  const existingUser = await User.findOne({ phoneNumber: normalizedPhoneNumber })
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
    phoneNumber: normalizedPhoneNumber,
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
  const email = normalizeEmail(data.email)
  const phoneNumber = normalizePhoneNumber(data.phoneNumber)
  const existingUser = await User.findOne({
    $or: [{ phoneNumber }, { email }],
  })
  if (existingUser) throw new Error('Phone number or email already registered')

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await User.create({
    phoneNumber,
    email,
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
      phone: data.practice?.phone || phoneNumber,
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
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) throw new Error('Invalid credentials')

  const user = await User.findOne({ email: normalizedEmail, deletedAt: { $exists: false } })
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
  const normalizedEmail = normalizeEmail(email)
  const user = await User.findOne({ email: normalizedEmail, deletedAt: { $exists: false } })
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
