import { User } from './prisma-registry.ts'

export type Id = string

export interface IUser {
  [key: string]: any
  id: string
  _id: string
  phoneNumber: string
  email?: string
  passwordHash?: string
  role: 'PATIENT' | 'DOCTOR' | 'LAB_OPERATOR' | 'PLATFORM_ADMIN'
  patientId?: Id
  doctorId?: Id
  labId?: Id
}

export { User }
