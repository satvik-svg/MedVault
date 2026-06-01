import type { Request, Response, NextFunction } from 'express'
import { AccessLog } from '../models/AccessLog.ts'

export function auditLog(action: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await AccessLog.create({
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        action,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        patientId: req.user?.patientId || req.params?.patientId || req.body?.patientId,
      })
    } catch {
      // Logging failure should not break the request
    }
    next()
  }
}
