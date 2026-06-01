import { Doctor } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface IDoctor {
  [key: string]: any
  id: string
  _id: string
  userId: Id
  fullName: string
  nmcRegNumber: string
  stateMedicalCouncil: string
  practice: any
  verification: any
  onboarding: any
  preferredLabIds: Id[]
  trustLevel: 'VERIFIED' | 'PENDING' | 'REJECTED'
}

export { Doctor }
