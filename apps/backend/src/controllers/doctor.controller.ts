import type { Request, Response } from 'express'
import { Doctor } from '../models/Doctor.ts'
import { queueDoctorForManualReview } from '../verification/nmc.verification.ts'

export async function registerDoctor(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'Use POST /api/auth/doctor/signup or POST /api/onboarding/doctor' })
}

export async function uploadNmcCertificate(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.doctorId) {
      res.status(403).json({ error: 'Not associated with a doctor profile' })
      return
    }
    const { certificateUrl } = req.body
    const doctor = await Doctor.findById(req.user.doctorId)
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }
    doctor.verification.nmcCertificateUrl = certificateUrl
    doctor.verification.manualReviewStatus = 'PENDING'
    await doctor.save()
    await queueDoctorForManualReview(req.user.doctorId)
    res.json({ message: 'NMC certificate uploaded and queued for review' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Certificate upload failed' })
  }
}

export async function getDoctorMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.doctorId) {
      res.status(404).json({ error: 'Doctor profile not found' })
      return
    }
    const doctor = await Doctor.findById(req.user.doctorId).populate('preferredLabIds', 'displayName address trustLevel')
    if (!doctor || doctor.deletedAt) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }
    res.json(doctor)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor profile' })
  }
}

export async function updateDoctorMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.doctorId) {
      res.status(404).json({ error: 'Doctor profile not found' })
      return
    }

    const allowed = ['photoUrl', 'specializations', 'qualifications', 'languages', 'yearsExperience', 'practice', 'hospitalAffiliations']
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    const doctor = await Doctor.findByIdAndUpdate(req.user.doctorId, { $set: update }, { new: true, runValidators: true })
    res.json(doctor)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Doctor update failed' })
  }
}

export async function updatePreferredLabs(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.doctorId) {
      res.status(404).json({ error: 'Doctor profile not found' })
      return
    }
    const doctor = await Doctor.findByIdAndUpdate(
      req.user.doctorId,
      { $set: { preferredLabIds: req.body.labIds || [] } },
      { new: true }
    ).populate('preferredLabIds', 'displayName address trustLevel')
    res.json(doctor)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Preferred lab update failed' })
  }
}
