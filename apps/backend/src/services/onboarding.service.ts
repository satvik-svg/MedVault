import bcrypt from 'bcrypt'
import { redis } from '../config/redis.ts'
import { Doctor } from '../models/Doctor.ts'
import { Lab } from '../models/Lab.ts'
import { Patient } from '../models/Patient.ts'
import { User } from '../models/User.ts'
import { generateMedvaultId, generateTempPassword } from '../utils/helpers.ts'
import { sendAdminAlert, sendWhatsApp } from './notification.service.ts'
import { queueDoctorForManualReview, queueLabForManualReview } from '../verification/nmc.verification.ts'

export async function onboardDoctorByAdmin(input: Record<string, any>, adminUserId: string): Promise<Record<string, unknown>> {
  const tempPassword = generateTempPassword()
  const user = await User.create({
    phoneNumber: input.phoneNumber || input.phone,
    email: input.email,
    passwordHash: await bcrypt.hash(tempPassword, 12),
    role: 'DOCTOR',
    mustChangePassword: true,
    isActive: true,
  })

  const doctor = await Doctor.create({
    userId: user._id,
    fullName: input.fullName,
    photoUrl: input.photoUrl,
    nmcRegNumber: input.nmcRegNumber,
    stateMedicalCouncil: input.stateMedicalCouncil,
    specializations: input.specializations || [],
    qualifications: input.qualifications || [],
    languages: input.languages || [],
    yearsExperience: input.yearsExperience,
    practice: {
      displayName: input.practice?.displayName || `${input.fullName}'s Practice`,
      address: {
        city: input.practice?.address?.city || 'UNKNOWN',
        line1: input.practice?.address?.line1,
        line2: input.practice?.address?.line2,
        state: input.practice?.address?.state,
        pincode: input.practice?.address?.pincode,
        geoLocation: input.practice?.address?.geoLocation,
      },
      phone: input.practice?.phone || input.phoneNumber || input.phone,
      operatingHours: input.practice?.operatingHours || [],
      consultationFee: input.practice?.consultationFee,
      logoUrl: input.practice?.logoUrl,
      signatureUrl: input.practice?.signatureUrl,
    },
    hospitalAffiliations: input.hospitalAffiliations || [],
    verification: {
      nmcCertificateUrl: input.nmcCertificateUrl,
      manualReviewStatus: 'PENDING',
    },
    onboarding: {
      method: 'ASSISTED_BY_STAFF',
      onboardedBy: adminUserId,
      initialLoginCompleted: false,
    },
    trustLevel: 'PENDING',
  })

  await User.updateOne({ _id: user._id }, { doctorId: doctor._id })
  await queueDoctorForManualReview(doctor._id.toString())
  await sendAdminAlert(`New doctor pending review: ${doctor.fullName} (${doctor.nmcRegNumber})`)
  return { doctor, tempPassword, message: 'Doctor created and queued for NMC review.' }
}

export async function sendDoctorCredentials(doctorId: string): Promise<{ sent: boolean }> {
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) throw new Error('Doctor not found')
  if (doctor.verification.manualReviewStatus !== 'APPROVED') throw new Error('Doctor is not approved yet')

  const user = await User.findById(doctor.userId)
  if (!user) throw new Error('Doctor user not found')

  const tempPassword = generateTempPassword()
  user.passwordHash = await bcrypt.hash(tempPassword, 12)
  user.mustChangePassword = true
  await user.save()

  await sendWhatsApp(user.phoneNumber, `Welcome to MedVault, Dr. ${doctor.fullName}.\nLogin: ${user.email}\nTemporary password: ${tempPassword}\nPlease change it on first login.`)
  return { sent: true }
}

export async function onboardLabByAdmin(input: Record<string, any>, adminUserId: string): Promise<Record<string, unknown>> {
  const lab = await Lab.create({
    legalName: input.legalName,
    displayName: input.displayName,
    phone: input.phone,
    email: input.email,
    website: input.website,
    logoUrl: input.logoUrl,
    gstin: input.gstin,
    nablAccreditationNumber: input.nablAccreditationNumber,
    tradeLicenseUrl: input.tradeLicenseUrl,
    premisesPhotoUrl: input.premisesPhotoUrl,
    address: input.address,
    operatingHours: input.operatingHours || [],
    sampleCollectionHours: input.sampleCollectionHours || [],
    holidayDates: input.holidayDates || [],
    homeCollectionAvailable: !!input.homeCollectionAvailable,
    homeCollectionCharge: input.homeCollectionCharge,
    homeCollectionCities: input.homeCollectionCities || [],
    testsOffered: input.testsOffered || [],
    verification: { manualReviewStatus: 'PENDING' },
    onboarding: { method: 'ASSISTED_BY_STAFF', onboardedBy: adminUserId, initialLoginCompleted: false },
    trustLevel: 'PENDING',
  })

  const operatorIds = []
  for (const operator of input.operators || []) {
    const tempPassword = generateTempPassword()
    const user = await User.create({
      phoneNumber: operator.phoneNumber || operator.phone,
      email: operator.email,
      passwordHash: await bcrypt.hash(tempPassword, 12),
      role: 'LAB_OPERATOR',
      labId: lab._id,
      mustChangePassword: true,
    })
    operatorIds.push(user._id)
  }

  await Lab.updateOne({ _id: lab._id }, { $set: { operatorUserIds: operatorIds } })
  await queueLabForManualReview(lab._id.toString())
  await sendAdminAlert(`New lab pending review: ${lab.displayName}`)
  return { lab: await Lab.findById(lab._id), message: 'Lab created and queued for review.' }
}

export async function sendLabCredentials(labId: string): Promise<{ sent: boolean }> {
  const lab = await Lab.findById(labId)
  if (!lab) throw new Error('Lab not found')
  if (lab.verification.manualReviewStatus !== 'APPROVED') throw new Error('Lab is not approved yet')

  const operators = await User.find({ _id: { $in: lab.operatorUserIds } })
  await Promise.all(operators.map(async (operator) => {
    const tempPassword = generateTempPassword()
    operator.passwordHash = await bcrypt.hash(tempPassword, 12)
    operator.mustChangePassword = true
    await operator.save()
    await sendWhatsApp(operator.phoneNumber, `MedVault lab portal access for ${lab.displayName}.\nLogin: ${operator.email}\nTemporary password: ${tempPassword}`)
  }))
  return { sent: true }
}

export async function initiatePatientQuickRegister(phoneNumber: string): Promise<{ otpSent: boolean; expiresIn: number; alreadyRegistered?: boolean; patientId?: string }> {
  const existingUser = await User.findOne({ phoneNumber, role: 'PATIENT' })
  if (existingUser) {
    return { otpSent: false, expiresIn: 0, alreadyRegistered: true, patientId: existingUser.patientId?.toString() }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  await redis.setex(`otp:quickreg:${phoneNumber}`, 600, await bcrypt.hash(otp, 10))
  await sendWhatsApp(phoneNumber, `Your MedVault walk-in registration OTP is ${otp}. Read it to the front desk staff. Valid for 10 minutes.`)
  return { otpSent: true, expiresIn: 600 }
}

export async function completePatientQuickRegister(input: Record<string, any>, registeredBy: string): Promise<Record<string, unknown>> {
  const hashedOtp = await redis.get(`otp:quickreg:${input.phoneNumber}`)
  if (!hashedOtp || !(await bcrypt.compare(input.otp, hashedOtp))) throw new Error('Invalid or expired OTP')
  await redis.del(`otp:quickreg:${input.phoneNumber}`)

  const user = await User.create({
    phoneNumber: input.phoneNumber,
    role: 'PATIENT',
    isPhoneVerified: true,
  })

  const medvaultId = generateMedvaultId()
  const patient = await Patient.create({
    userId: user._id,
    medvaultId,
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth || new Date(),
    sex: input.sex || 'O',
    contact: { primaryPhone: input.phoneNumber },
    onboarding: { method: 'QUICK_REGISTER_BY_STAFF', registeredBy },
  })

  await User.updateOne({ _id: user._id }, { patientId: patient._id })
  await sendWhatsApp(input.phoneNumber, `Welcome to MedVault. Your MedVault ID is ${medvaultId}. Complete your profile from your phone when convenient.`)
  return { patient, medvaultId }
}
