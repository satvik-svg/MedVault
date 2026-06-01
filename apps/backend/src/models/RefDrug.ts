import mongoose, { Schema, type Document } from 'mongoose'

export interface IRefDrug extends Document {
  rxnormCui: string
  genericName: string
  brandNames: string[]
  indianBrandNames: Array<{
    brand: string
    manufacturer?: string
    formulations: string[]
  }>
  drugClass?: string
  atcCode?: string
  commonStrengths: string[]
  forms: string[]
  routes: string[]
  pregnancyCategory?: string
  renalDoseAdjust?: {
    required: boolean
    notes?: string
  }
  hepaticDoseAdjust?: {
    required: boolean
    notes?: string
  }
  interactingClasses: string[]
}

const RefDrugSchema = new Schema<IRefDrug>({
  rxnormCui: { type: String, required: true, unique: true, index: true },
  genericName: { type: String, required: true, index: true },
  brandNames: [{ type: String, index: true }],
  indianBrandNames: [{
    brand: { type: String, index: true },
    manufacturer: String,
    formulations: [String],
  }],
  drugClass: { type: String, index: true },
  atcCode: String,
  commonStrengths: [String],
  forms: [String],
  routes: [String],
  pregnancyCategory: String,
  renalDoseAdjust: {
    required: { type: Boolean, default: false },
    notes: String,
  },
  hepaticDoseAdjust: {
    required: { type: Boolean, default: false },
    notes: String,
  },
  interactingClasses: [String],
}, { timestamps: false })

RefDrugSchema.index({
  genericName: 'text',
  brandNames: 'text',
  'indianBrandNames.brand': 'text',
})

export const RefDrug = mongoose.model<IRefDrug>('RefDrug', RefDrugSchema)
