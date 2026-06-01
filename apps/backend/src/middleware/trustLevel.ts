import type { Request, Response, NextFunction } from 'express'
import { Doctor } from '../models/Doctor.ts'

const TRUST_LEVEL_ORDER: Record<string, number> = {
  'TIER_1_FULL': 3,
  'TIER_2_INDEPENDENT': 2,
  'TIER_2_PARTIAL': 2,
  'TIER_3_PENDING': 1,
  'TIER_3_UNVERIFIED': 1,
  'TIER_4_REJECTED': 0,
}

function isAtLeastTier(current: string, minLevel: string): boolean {
  return (TRUST_LEVEL_ORDER[current] ?? 0) >= (TRUST_LEVEL_ORDER[minLevel] ?? 0)
}

export function requireTrustLevel(minLevel: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' })
      return
    }

    if (req.user.role === 'DOCTOR' && req.user.doctorId) {
      const doctor = await Doctor.findById(req.user.doctorId).select('trustLevel')
      if (!doctor || !isAtLeastTier(doctor.trustLevel, minLevel)) {
        res.status(403).json({ error: 'Doctor verification pending or insufficient trust level' })
        return
      }
    }

    if ((req.user.role === 'CLINIC_ADMIN' || req.user.role === 'LAB_OPERATOR' || req.user.role === 'PHARMACY_OPERATOR') && req.user.clinicId) {
      const { Clinic } = await import('../models/Clinic.ts')
      const clinic = await Clinic.findById(req.user.clinicId).select('trustLevel')
      if (!clinic || !isAtLeastTier(clinic.trustLevel, minLevel)) {
        res.status(403).json({ error: 'Clinic verification pending or insufficient trust level' })
        return
      }
    }

    next()
  }
}
