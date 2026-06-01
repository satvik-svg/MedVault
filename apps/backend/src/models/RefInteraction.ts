import { RefInteraction } from './prisma-registry.ts'

export interface IRefInteraction {
  [key: string]: any
  id: string
  _id: string
  drug1Cui: string
  drug2Cui: string
  severity: 'CONTRAINDICATED' | 'SEVERE' | 'MODERATE' | 'MINOR'
}

export { RefInteraction }
