import type { Request, Response } from 'express'
import { Patient } from '../models/Patient.ts'

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.patientId) {
      res.status(404).json({ error: 'Patient profile not found' })
      return
    }
    const patient = await Patient.findById(req.user.patientId)
    if (!patient || patient.deletedAt) {
      res.status(404).json({ error: 'Patient not found' })
      return
    }
    res.json(patient)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient profile' })
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.patientId) {
      res.status(404).json({ error: 'Patient profile not found' })
      return
    }
    const updates = req.body
    const patient = await Patient.findByIdAndUpdate(
      req.user.patientId,
      { $set: updates },
      { new: true, runValidators: true }
    )
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' })
      return
    }
    res.json(patient)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update profile' })
  }
}
