import type { Request, Response } from 'express'
import { Clinic } from '../models/Clinic.ts'
import { processHfrVerification } from '../verification/clinic.verification.ts'
import { verifyDomainViaDns } from '../verification/domain.verification.ts'

export async function registerClinic(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'Use POST /api/auth/clinic/signup instead' })
}

export async function verifyHfr(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.clinicId) {
      res.status(403).json({ error: 'Not associated with a clinic' })
      return
    }
    const result = await processHfrVerification(req.user.clinicId)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'HFR verification failed' })
  }
}

export async function verifyDomain(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.clinicId) {
      res.status(403).json({ error: 'Not associated with a clinic' })
      return
    }
    const { domain } = req.body
    const verified = await verifyDomainViaDns(domain, req.user.clinicId)

    if (verified) {
      const clinic = await Clinic.findById(req.user.clinicId)
      if (clinic) {
        clinic.verification.domainVerified = true
        clinic.verification.verifiedDomains = [...clinic.verification.verifiedDomains, domain]
        if (clinic.verification.hfrVerified && clinic.verification.gstVerified) {
          clinic.trustLevel = 'TIER_1_FULL'
        } else {
          clinic.trustLevel = 'TIER_2_PARTIAL'
        }
        await clinic.save()
      }
    }

    res.json({ verified, domain })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Domain verification failed' })
  }
}

export async function uploadDocuments(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.clinicId) {
      res.status(403).json({ error: 'Not associated with a clinic' })
      return
    }
    const { type, url } = req.body
    const clinic = await Clinic.findById(req.user.clinicId)
    if (!clinic) {
      res.status(404).json({ error: 'Clinic not found' })
      return
    }
    clinic.verification.documentsUploaded.push({ type, url, uploadedAt: new Date() })
    await clinic.save()
    res.json(clinic.verification.documentsUploaded)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Document upload failed' })
  }
}

export async function getClinicMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.clinicId) {
      res.status(404).json({ error: 'Clinic not found' })
      return
    }
    const clinic = await Clinic.findById(req.user.clinicId)
    if (!clinic || clinic.deletedAt) {
      res.status(404).json({ error: 'Clinic not found' })
      return
    }
    res.json(clinic)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clinic' })
  }
}
