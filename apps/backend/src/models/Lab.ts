import { Lab } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface ILab {
  [key: string]: any
  id: string
  _id: string
  displayName: string
  address: any
  operatingHours: any[]
  testsOffered: any[]
  operatorUserIds: Id[]
  verification: any
  trustLevel: 'VERIFIED' | 'PENDING' | 'REJECTED'
  isActive: boolean
}

export { Lab }
