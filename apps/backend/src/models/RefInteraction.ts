import mongoose, { Schema, type Document } from 'mongoose'

export interface IRefInteraction extends Document {
  drug1Cui: string
  drug2Cui: string
  severity: 'CONTRAINDICATED' | 'SEVERE' | 'MODERATE' | 'MINOR'
  mechanism?: string
  clinicalEffect?: string
  management?: string
  source: 'DRUGBANK' | 'OPENFDA' | 'CURATED'
}

const RefInteractionSchema = new Schema<IRefInteraction>({
  drug1Cui: { type: String, required: true, index: true },
  drug2Cui: { type: String, required: true, index: true },
  severity: {
    type: String,
    enum: ['CONTRAINDICATED', 'SEVERE', 'MODERATE', 'MINOR'],
    required: true,
  },
  mechanism: String,
  clinicalEffect: String,
  management: String,
  source: {
    type: String,
    enum: ['DRUGBANK', 'OPENFDA', 'CURATED'],
    required: true,
  },
}, { timestamps: false })

RefInteractionSchema.index({ drug1Cui: 1, drug2Cui: 1 }, { unique: true })

export const RefInteraction = mongoose.model<IRefInteraction>('RefInteraction', RefInteractionSchema)
