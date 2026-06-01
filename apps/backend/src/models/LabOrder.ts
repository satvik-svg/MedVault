import { LabOrder } from './prisma-registry.ts'
import type { Id } from './User.ts'

export type LabOrderStatus =
  | 'CREATED' | 'PATIENT_NOTIFIED' | 'ACKNOWLEDGED_BY_LAB' | 'PATIENT_VISITED'
  | 'SAMPLE_COLLECTED' | 'IN_PROCESSING' | 'REPORT_UPLOADED' | 'DELIVERED_TO_DOCTOR'
  | 'CANCELLED_BY_PATIENT' | 'CANCELLED_BY_LAB' | 'EXPIRED'

export interface ILabOrder {
  [key: string]: any
  id: string
  _id: string
  patientId: Id
  doctorId: Id
  visitId: Id
  labId: Id
  status: LabOrderStatus
  tests: any[]
  statusHistory: any[]
}

export { LabOrder }
