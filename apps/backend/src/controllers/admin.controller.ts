import type { Request, Response } from 'express'
import { approveDoctorNmc, rejectDoctorNmc, requestDoctorMoreDocs, getPendingVerificationQueue } from '../verification/nmc.verification.ts'
import { approveLabManually, rejectLabManually } from '../verification/lab.verification.ts'
import { Doctor } from '../models/Doctor.ts'
import { Lab } from '../models/Lab.ts'

export async function approveDoctor(req: Request, res: Response): Promise<void> {
  try {
    await approveDoctorNmc(req.params.id, req.user!.userId, req.body.notes)
    res.json({ message: 'Doctor NMC approved' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Approval failed' })
  }
}

export async function rejectDoctor(req: Request, res: Response): Promise<void> {
  try {
    await rejectDoctorNmc(req.params.id, req.user!.userId, req.body.reason)
    res.json({ message: 'Doctor NMC rejected' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Rejection failed' })
  }
}

export async function requestDoctorDocs(req: Request, res: Response): Promise<void> {
  try {
    await requestDoctorMoreDocs(req.params.id, req.user!.userId, req.body.notes || 'More documents required')
    res.json({ message: 'Doctor marked as needing more documents' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Request failed' })
  }
}

export async function approveLab(req: Request, res: Response): Promise<void> {
  try {
    await approveLabManually(req.params.id, req.user!.userId, req.body.notes)
    res.json({ message: 'Lab approved' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab approval failed' })
  }
}

export async function rejectLab(req: Request, res: Response): Promise<void> {
  try {
    await rejectLabManually(req.params.id, req.user!.userId, req.body.reason)
    res.json({ message: 'Lab rejected' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab rejection failed' })
  }
}

export async function getVerificationQueue(_req: Request, res: Response): Promise<void> {
  try {
    const [doctorDocs, labDocs] = await Promise.all([
      Doctor.find({ 'verification.manualReviewStatus': 'PENDING', deletedAt: { $exists: false } })
        .select('fullName nmcRegNumber stateMedicalCouncil verification createdAt')
        .lean(),
      Lab.find({ 'verification.manualReviewStatus': 'PENDING', deletedAt: { $exists: false } })
        .select('displayName legalName address verification createdAt')
        .lean(),
    ])

    res.json({
      memoryQueue: getPendingVerificationQueue(),
      doctors: doctorDocs,
      labs: labDocs,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch verification queue' })
  }
}
