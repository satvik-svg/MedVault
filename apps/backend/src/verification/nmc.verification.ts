import mongoose from 'mongoose'
import { Doctor } from '../models/Doctor.ts'

interface VerificationQueueItem {
  type: 'DOCTOR_NMC' | 'CLINIC_MANUAL'
  targetId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedAt: Date
}

// Simple in-memory queue for Phase 1; migrate to DB-backed queue in later phases
const verificationQueue: VerificationQueueItem[] = []

export async function queueDoctorForManualReview(doctorId: string): Promise<void> {
  verificationQueue.push({
    type: 'DOCTOR_NMC',
    targetId: doctorId,
    status: 'PENDING',
    submittedAt: new Date(),
  })
}

export async function approveDoctorNmc(doctorId: string, reviewedBy: string): Promise<void> {
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) throw new Error('Doctor not found')

  doctor.verification.nmcVerified = true
  doctor.verification.nmcVerifiedAt = new Date()
  doctor.verification.nmcVerificationMethod = 'MANUAL_DOCUMENT_REVIEW'
  doctor.verification.documentsReviewed = true
  doctor.verification.reviewedBy = new mongoose.Types.ObjectId(reviewedBy) as any
  doctor.verification.reviewedAt = new Date()
  doctor.verification.reviewNotes = 'Approved by platform admin'

  // Upgrade trust level when NMC verified
  if (doctor.verification.nmcVerified) {
    const hasActiveAffiliation = doctor.affiliations.some(a => a.isActive && a.confirmedByClinic)
    doctor.trustLevel = hasActiveAffiliation ? 'TIER_1_FULL' : 'TIER_2_INDEPENDENT'
  }

  await doctor.save()

  // Update queue
  const item = verificationQueue.find(q => q.targetId === doctorId && q.type === 'DOCTOR_NMC')
  if (item) item.status = 'APPROVED'
}

export async function rejectDoctorNmc(doctorId: string, reviewedBy: string, reason: string): Promise<void> {
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) throw new Error('Doctor not found')

  doctor.trustLevel = 'TIER_4_REJECTED'
  doctor.verification.documentsReviewed = true
  doctor.verification.reviewedBy = new mongoose.Types.ObjectId(reviewedBy) as any
  doctor.verification.reviewedAt = new Date()
  doctor.verification.reviewNotes = reason
  await doctor.save()

  const item = verificationQueue.find(q => q.targetId === doctorId && q.type === 'DOCTOR_NMC')
  if (item) item.status = 'REJECTED'
}

export function getPendingVerificationQueue(): VerificationQueueItem[] {
  return verificationQueue.filter(q => q.status === 'PENDING')
}
