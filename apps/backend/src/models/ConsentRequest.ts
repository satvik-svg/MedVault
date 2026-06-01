import { ConsentRequest } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface IConsentRequest {
  [key: string]: any
  id: string
  _id: string
  patientId: Id
  granteeUserId: Id
  granteeType: 'DOCTOR' | 'LAB'
  scope: string[]
  purpose: 'CONSULTATION' | 'LAB_REVIEW' | 'OTHER'
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED'
  expiresAt: Date
  nonce: string
}

export { ConsentRequest }
