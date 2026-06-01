import { LabReport } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface ILabReport {
  [key: string]: any
  id: string
  _id: string
  patientId: Id
  labId?: Id
  orderedByDoctorId?: Id
  source: 'MEDVAULT_NATIVE_LAB_PARTNER' | 'MEDVAULT_NATIVE_DOCTOR_ENTRY' | 'EXTERNAL_OCR' | 'EXTERNAL_MANUAL'
  reportNumber?: string
  reportDate: Date
  results: any[]
  hasAbnormalValues: boolean
  hasCriticalValues: boolean
  blockchain?: any
}

export { LabReport }
