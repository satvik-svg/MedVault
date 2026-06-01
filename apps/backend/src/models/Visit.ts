import { Visit } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface IVisit {
  [key: string]: any
  id: string
  _id: string
  patientId: Id
  doctorId?: Id
  startedAt: Date
  status: 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
  type: 'NEW_PATIENT' | 'FOLLOW_UP' | 'WALK_IN'
  preVisitSymptoms?: any
  labOrderIds: Id[]
}

export { Visit }
