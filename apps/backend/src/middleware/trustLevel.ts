import type { Request, Response, NextFunction } from 'express'
import { Doctor } from '../models/Doctor.ts'

const TRUST_LEVEL_ORDER: Record<string, number> = {
  VERIFIED: 3,
  PENDING: 1,
  REJECTED: 0,
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

    if (req.user.role === 'LAB_OPERATOR' && req.user.labId) {
      const { Lab } = await import('../models/Lab.ts')
      const lab = await Lab.findById(req.user.labId).select('trustLevel')
      if (!lab || !isAtLeastTier(lab.trustLevel, minLevel)) {
        res.status(403).json({ error: 'Lab verification pending or insufficient trust level' })
        return
      }
    }

    next()
  }
}
