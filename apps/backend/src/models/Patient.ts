import { Patient } from './prisma-registry.ts'
import type { Id } from './User.ts'

export interface IPatient {
  [key: string]: any
  id: string
  _id: string
  userId: Id
  medvaultId: string
  fullName: string
  dateOfBirth: Date
  sex: 'M' | 'F' | 'O'
  contact: any
  allergies: any[]
  chronicConditions: any[]
  activeMedications: any[]
  stats: any
}

export { Patient }
