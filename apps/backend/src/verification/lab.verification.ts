import { Lab } from '../models/Lab.ts'
import { User } from '../models/User.ts'
import { sendWhatsApp } from '../services/notification.service.ts'

export async function approveLabManually(labId: string, reviewedBy: string, notes = 'Approved by platform admin'): Promise<void> {
  const lab = await Lab.findById(labId)
  if (!lab) throw new Error('Lab not found')

  lab.verification.manualReviewStatus = 'APPROVED'
  lab.verification.reviewedBy = reviewedBy
  lab.verification.reviewedAt = new Date()
  lab.verification.reviewNotes = notes
  lab.trustLevel = 'VERIFIED'
  await lab.save()

  const operators = await User.find({ _id: { $in: lab.operatorUserIds } }).select('phoneNumber')
  await Promise.all(operators.map((operator) =>
    sendWhatsApp(operator.phoneNumber, `${lab.displayName} is verified on MedVault. You can now receive lab orders.`)
  ))
}

export async function rejectLabManually(labId: string, reviewedBy: string, reason: string): Promise<void> {
  const lab = await Lab.findById(labId)
  if (!lab) throw new Error('Lab not found')

  lab.verification.manualReviewStatus = 'REJECTED'
  lab.verification.reviewedBy = reviewedBy
  lab.verification.reviewedAt = new Date()
  lab.verification.reviewNotes = reason
  lab.trustLevel = 'REJECTED'
  await lab.save()
}
