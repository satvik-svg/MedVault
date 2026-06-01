import { RefDrug } from './prisma-registry.ts'

export interface IRefDrug {
  [key: string]: any
  id: string
  _id: string
  rxnormCui: string
  genericName: string
  brandNames: string[]
  indianBrandNames: any[]
  drugClass?: string
}

export { RefDrug }
