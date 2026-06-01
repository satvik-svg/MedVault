import mongoose, { Schema, type Document, type ObjectId } from 'mongoose'

export type LabOrderStatus =
  | 'CREATED'
  | 'PATIENT_NOTIFIED'
  | 'ACKNOWLEDGED_BY_LAB'
  | 'PATIENT_VISITED'
  | 'SAMPLE_COLLECTED'
  | 'IN_PROCESSING'
  | 'REPORT_UPLOADED'
  | 'DELIVERED_TO_DOCTOR'
  | 'CANCELLED_BY_PATIENT'
  | 'CANCELLED_BY_LAB'
  | 'EXPIRED'

export interface ILabOrder extends Document {
  patientId: ObjectId
  doctorId: ObjectId
  visitId: ObjectId
  prescriptionId?: ObjectId
  labId: ObjectId
  orderNumber: string
  tests: Array<{
    loincCode: string
    displayName: string
    sampleType?: string
    fastingRequired?: boolean
    notes?: string
    estimatedPrice?: number
  }>
  totalEstimatedPrice?: number
  homeCollectionRequested: boolean
  homeCollectionAddress?: string
  preferredCollectionTime?: Date
  status: LabOrderStatus
  statusHistory: Array<{
    status: LabOrderStatus
    timestamp: Date
    actor?: ObjectId
    note?: string
  }>
  labReportId?: ObjectId
  patientWentToAlternateLab: boolean
  alternateLabName?: string
  commercial: {
    commissionApplicable: boolean
    commissionAmount?: number
    invoicedAt?: Date
    paidOutAt?: Date
  }
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LabOrderSchema = new Schema<ILabOrder>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  visitId: { type: Schema.Types.ObjectId, ref: 'Visit', required: true },
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
  orderNumber: { type: String, unique: true, index: true },
  tests: [{
    loincCode: { type: String, required: true },
    displayName: { type: String, required: true },
    sampleType: String,
    fastingRequired: Boolean,
    notes: String,
    estimatedPrice: Number,
  }],
  totalEstimatedPrice: Number,
  homeCollectionRequested: { type: Boolean, default: false },
  homeCollectionAddress: String,
  preferredCollectionTime: Date,
  status: {
    type: String,
    enum: [
      'CREATED',
      'PATIENT_NOTIFIED',
      'ACKNOWLEDGED_BY_LAB',
      'PATIENT_VISITED',
      'SAMPLE_COLLECTED',
      'IN_PROCESSING',
      'REPORT_UPLOADED',
      'DELIVERED_TO_DOCTOR',
      'CANCELLED_BY_PATIENT',
      'CANCELLED_BY_LAB',
      'EXPIRED',
    ],
    default: 'CREATED',
    index: true,
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    note: String,
  }],
  labReportId: { type: Schema.Types.ObjectId, ref: 'LabReport' },
  patientWentToAlternateLab: { type: Boolean, default: false },
  alternateLabName: String,
  commercial: {
    commissionApplicable: { type: Boolean, default: false },
    commissionAmount: Number,
    invoicedAt: Date,
    paidOutAt: Date,
  },
  expiresAt: { type: Date, index: true },
}, { timestamps: true })

LabOrderSchema.index({ patientId: 1, status: 1 })
LabOrderSchema.index({ labId: 1, status: 1, createdAt: -1 })
LabOrderSchema.index({ doctorId: 1, createdAt: -1 })

export const LabOrder = mongoose.model<ILabOrder>('LabOrder', LabOrderSchema)
