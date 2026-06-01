import { AccessLog } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface IAccessLog {
  [key: string]: any
  id: string
  _id: string
  actorUserId?: Id
  actorRole?: string
  action: string
  targetType?: string
  targetId?: Id
  patientId?: Id
  metadata?: Record<string, unknown>
}

export { AccessLog }
