import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { approveDoctorNmc, rejectDoctorNmc, getPendingVerificationQueue } from '../verification/nmc.verification.ts'
import { Clinic } from '../models/Clinic.ts'

export async function approveClinic(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const clinic = await Clinic.findById(id)
    if (!clinic) {
      res.status(404).json({ error: 'Clinic not found' })
      return
    }
    clinic.verification.manualReviewStatus = 'APPROVED'
    clinic.verification.reviewedBy = new mongoose.Types.ObjectId(req.user!.userId) as any
    clinic.verification.reviewedAt = new Date()
    clinic.trustLevel = 'TIER_1_FULL'
    await clinic.save()
    res.json(clinic)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Approval failed' })
  }
}

export async function approveDoctor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    await approveDoctorNmc(id, req.user!.userId)
    res.json({ message: 'Doctor NMC approved' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Approval failed' })
  }
}

export async function rejectDoctor(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body
    await rejectDoctorNmc(id, req.user!.userId, reason)
    res.json({ message: 'Doctor NMC rejected' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Rejection failed' })
  }
}

export async function getVerificationQueue(_req: Request, res: Response): Promise<void> {
  try {
    const queue = getPendingVerificationQueue()
    res.json(queue)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch verification queue' })
  }
}
