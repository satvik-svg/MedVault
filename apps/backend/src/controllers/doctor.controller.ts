import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Doctor } from '../models/Doctor.ts'
import { Clinic } from '../models/Clinic.ts'
import { queueDoctorForManualReview } from '../verification/nmc.verification.ts'

export async function registerDoctor(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'Use POST /api/auth/doctor/signup instead' })
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
    doctor.qualifications.push({
      degree: 'NMC Registration',
      institution: 'National Medical Commission',
      year: new Date().getFullYear(),
      certificateUrl,
    })
    await doctor.save()

    // Queue for manual review
    await queueDoctorForManualReview(req.user.doctorId)

    res.json({ message: 'NMC certificate uploaded and queued for review' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Certificate upload failed' })
  }
}

export async function affiliateWithClinic(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.doctorId) {
      res.status(403).json({ error: 'Not a doctor' })
      return
    }
    const { clinicId } = req.params
    const { role } = req.body

    const clinic = await Clinic.findById(clinicId)
    if (!clinic) {
      res.status(404).json({ error: 'Clinic not found' })
      return
    }

    const doctor = await Doctor.findById(req.user.doctorId)
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }

    // Check if affiliation already exists
    const existing = doctor.affiliations.find(
      a => a.clinicId.toString() === clinicId && a.isActive
    )
    if (existing) {
      res.status(400).json({ error: 'Affiliation already exists' })
      return
    }

    doctor.affiliations.push({
      clinicId: clinic._id as mongoose.Types.ObjectId,
      role: role || 'CONSULTANT',
      confirmedByDoctor: true,
      confirmedByClinic: false,
      activeSince: new Date(),
      isActive: true,
    } as any)
    await doctor.save()

    res.json(doctor.affiliations)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Affiliation failed' })
  }
}

export async function confirmDoctorAffiliation(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.clinicId) {
      res.status(403).json({ error: 'Not a clinic admin' })
      return
    }
    const { doctorId } = req.params

    const doctor = await Doctor.findById(doctorId)
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }

    const affiliation = doctor.affiliations.find(
      a => a.clinicId.toString() === req.user!.clinicId && a.isActive
    )
    if (!affiliation) {
      res.status(400).json({ error: 'No pending affiliation found' })
      return
    }

    affiliation.confirmedByClinic = true

    // Upgrade trust level if NMC verified and affiliation is bilateral
    if (doctor.verification.nmcVerified && affiliation.confirmedByDoctor) {
      doctor.trustLevel = 'TIER_1_FULL'
    }

    await doctor.save()

    // Update clinic stats
    await Clinic.findByIdAndUpdate(req.user.clinicId, { $inc: { 'stats.totalDoctors': 1 } })

    res.json(doctor)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Affiliation confirmation failed' })
  }
}

export async function getDoctorMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.doctorId) {
      res.status(404).json({ error: 'Doctor profile not found' })
      return
    }
    const doctor = await Doctor.findById(req.user.doctorId)
      .populate('affiliations.clinicId', 'displayName legalName')
    if (!doctor || doctor.deletedAt) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }
    res.json(doctor)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor profile' })
  }
}
