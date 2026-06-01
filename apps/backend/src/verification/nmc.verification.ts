import { Doctor } from '../models/Doctor.ts'
import { sendWhatsApp } from '../services/notification.service.ts'
import { User } from '../models/User.ts'

interface VerificationQueueItem {
  type: 'DOCTOR_NMC' | 'LAB_MANUAL'
  targetId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_DOCS'
  submittedAt: Date
}

const verificationQueue: VerificationQueueItem[] = []

export async function queueDoctorForManualReview(doctorId: string): Promise<void> {
  if (verificationQueue.some((item) => item.type === 'DOCTOR_NMC' && item.targetId === doctorId && item.status === 'PENDING')) return
  verificationQueue.push({
    type: 'DOCTOR_NMC',
    targetId: doctorId,
    status: 'PENDING',
    submittedAt: new Date(),
  })
}

export async function queueLabForManualReview(labId: string): Promise<void> {
  if (verificationQueue.some((item) => item.type === 'LAB_MANUAL' && item.targetId === labId && item.status === 'PENDING')) return
  verificationQueue.push({
    type: 'LAB_MANUAL',
    targetId: labId,
    status: 'PENDING',
    submittedAt: new Date(),
  })
}

export async function approveDoctorNmc(doctorId: string, reviewedBy: string, notes = 'Approved by platform admin'): Promise<void> {
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) throw new Error('Doctor not found')

  doctor.verification.nmcVerified = true
  doctor.verification.nmcVerifiedAt = new Date()
  doctor.verification.manualReviewStatus = 'APPROVED'
  doctor.verification.reviewedBy = reviewedBy
  doctor.verification.reviewedAt = new Date()
  doctor.verification.reviewNotes = notes
  doctor.trustLevel = 'VERIFIED'
  await doctor.save()

  const item = verificationQueue.find(q => q.targetId === doctorId && q.type === 'DOCTOR_NMC')
  if (item) item.status = 'APPROVED'

  const user = await User.findById(doctor.userId)
  await sendWhatsApp(user?.phoneNumber, `Welcome to MedVault, Dr. ${doctor.fullName}. Your NMC review is approved. You can now log in and start using MedVault.`)
}

export async function rejectDoctorNmc(doctorId: string, reviewedBy: string, reason: string): Promise<void> {
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) throw new Error('Doctor not found')

  doctor.trustLevel = 'REJECTED'
  doctor.verification.manualReviewStatus = 'REJECTED'
  doctor.verification.reviewedBy = reviewedBy
  doctor.verification.reviewedAt = new Date()
  doctor.verification.reviewNotes = reason
  await doctor.save()

  const item = verificationQueue.find(q => q.targetId === doctorId && q.type === 'DOCTOR_NMC')
  if (item) item.status = 'REJECTED'
}

export async function requestDoctorMoreDocs(doctorId: string, reviewedBy: string, notes: string): Promise<void> {
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) throw new Error('Doctor not found')

  doctor.verification.manualReviewStatus = 'NEEDS_MORE_DOCS'
  doctor.verification.reviewedBy = reviewedBy
  doctor.verification.reviewedAt = new Date()
  doctor.verification.reviewNotes = notes
  await doctor.save()

  const item = verificationQueue.find(q => q.targetId === doctorId && q.type === 'DOCTOR_NMC')
  if (item) item.status = 'NEEDS_MORE_DOCS'
}

export function getPendingVerificationQueue(): VerificationQueueItem[] {
  return verificationQueue.filter(q => q.status === 'PENDING')
}
