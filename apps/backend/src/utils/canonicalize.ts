import type { IPrescription } from '../models/Prescription.ts'

function objectIdToString(value: unknown): string {
  if (value && typeof value === 'object' && 'toString' in value) {
    return value.toString()
  }
  return String(value ?? '')
}

export function canonicalizePrescriptionForHashing(prescription: IPrescription): string {
  const createdAt = prescription.createdAt instanceof Date
    ? prescription.createdAt.toISOString()
    : new Date(prescription.createdAt).toISOString()

  const canonical = {
    prescriptionNumber: prescription.prescriptionNumber || '',
    patientId: objectIdToString(prescription.patientId),
    doctorId: objectIdToString(prescription.doctorId),
    clinicId: objectIdToString(prescription.clinicId),
    createdAt,
    diagnosis: (prescription.diagnosis || [])
      .map((diagnosis) => ({
        icd10: diagnosis.icd10Code,
        primary: !!diagnosis.isPrimary,
      }))
      .sort((a, b) => a.icd10.localeCompare(b.icd10)),
    medications: (prescription.medications || [])
      .map((medication) => ({
        cui: medication.rxnormCui,
        strength: medication.strength || '',
        form: medication.form || '',
        route: medication.route || '',
        frequency: medication.dosage?.frequency || '',
        duration: `${medication.dosage?.duration?.value || 0}${medication.dosage?.duration?.unit || 'DAYS'}`,
      }))
      .sort((a, b) => a.cui.localeCompare(b.cui)),
    labOrders: (prescription.labOrders || [])
      .map((order) => order.loincCode || order.displayName || '')
      .filter(Boolean)
      .sort(),
  }

  return JSON.stringify(canonical)
}
