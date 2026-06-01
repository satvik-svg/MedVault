import { Prescription } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface IPrescription {
  [key: string]: any
  id: string
  _id: string
  patientId: Id
  doctorId?: Id
  visitId?: Id
  prescriptionNumber?: string
  source: 'MEDVAULT_NATIVE' | 'EXTERNAL_OCR' | 'EXTERNAL_MANUAL_ENTRY'
  status: 'DRAFT' | 'ISSUED' | 'EXPIRED' | 'REVOKED'
  diagnosis: any[]
  medications: any[]
  drugs?: any[]
  labOrders: any[]
  followUp?: any
  blockchain?: any
  isExpired: boolean
  createdAt: Date
}

export { Prescription }
