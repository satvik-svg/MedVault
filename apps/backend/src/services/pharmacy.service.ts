import { AccessLog } from '../models/AccessLog.ts'
import { Clinic } from '../models/Clinic.ts'
import { Prescription } from '../models/Prescription.ts'
import { enqueueFulfillmentAnchor } from '../jobs/queues.ts'
import { verifySignedPayload } from '../utils/qr.ts'
import { sendWhatsApp } from './notification.service.ts'

interface PrescriptionQrPayload extends Record<string, unknown> {
  type: string
  pid: string
  pn: string
}

export async function scanPrescriptionQR(qrData: string): Promise<unknown> {
  const signedPayload = qrData.replace('medvault://rx/', '')
  const payload = verifySignedPayload<PrescriptionQrPayload>(signedPayload)
  if (payload.type !== 'PRESCRIPTION') throw new Error('Wrong QR type')

  const prescription = await Prescription.findById(payload.pid)
    .populate('doctorId clinicId patientId')
  if (!prescription) throw new Error('Prescription not found')

  if (prescription.fulfillment?.status === 'FULLY_DISPENSED') {
    throw new Error('Prescription already fully dispensed')
  }
  if (prescription.validUntil && prescription.validUntil < new Date()) {
    throw new Error('Prescription expired')
  }

  return prescription
}

export async function dispensePrescription(input: {
  prescriptionId: string
  pharmacyClinicId: string
  operatorUserId: string
  partial?: boolean
  notes?: string
  substitutions?: Array<{ originalRxnormCui?: string; substitutedWithCui?: string; reason?: string }>
}): Promise<unknown> {
  const pharmacy = await Clinic.findById(input.pharmacyClinicId)
  if (!pharmacy) throw new Error('Pharmacy not found')
  if (!['PHARMACY', 'MULTI_SPECIALTY'].includes(pharmacy.type)) {
    throw new Error('Clinic is not authorized for pharmacy fulfillment')
  }
  if (pharmacy.trustLevel !== 'TIER_1_FULL') {
    throw new Error('Pharmacy must be fully verified before dispensing')
  }

  const prescription = await Prescription.findByIdAndUpdate(
    input.prescriptionId,
    {
      $set: {
        status: input.partial ? 'ISSUED' : 'DISPENSED',
        'fulfillment.status': input.partial ? 'PARTIALLY_DISPENSED' : 'FULLY_DISPENSED',
        'fulfillment.dispensedAt': new Date(),
        'fulfillment.dispensedBy': input.operatorUserId,
        'fulfillment.pharmacyClinicId': input.pharmacyClinicId,
        'fulfillment.pharmacyNotes': input.notes,
        'fulfillment.substitutions': input.substitutions || [],
      },
    },
    { new: true }
  ).populate('patientId')

  if (!prescription) throw new Error('Prescription not found')

  await enqueueFulfillmentAnchor(input.prescriptionId)
  await AccessLog.create({
    actorUserId: input.operatorUserId,
    action: 'DISPENSE_PRESCRIPTION',
    targetType: 'Prescription',
    targetId: prescription._id,
    patientId: prescription.patientId,
    metadata: { pharmacyClinicId: input.pharmacyClinicId, partial: !!input.partial },
  })

  const patient = prescription.patientId as unknown as { contact?: { primaryPhone?: string } }
  await sendWhatsApp(patient.contact?.primaryPhone, `Prescription ${prescription.prescriptionNumber || prescription._id.toString()} was dispensed.`)
  return prescription
}
