import { Consent } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface IConsent {
  [key: string]: any
  id: string
  _id: string
  patientId: Id
  granteeUserId: Id
  granteeType: 'DOCTOR' | 'LAB'
  scope: string[]
  grantedAt: Date
  expiresAt: Date
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'AUTO_RENEWED'
  grantMethod: 'EXPLICIT_WHATSAPP' | 'AUTO_RECENT_DOCTOR'
  nonce: string
}

export { Consent }
