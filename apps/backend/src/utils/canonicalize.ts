import type { IPrescription } from '../models/Prescription.ts'
import type { ILabReport } from '../models/LabReport.ts'

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
    visitId: objectIdToString(prescription.visitId),
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

export function canonicalizeLabReportForHashing(labReport: ILabReport): string {
  const reportDate = labReport.reportDate instanceof Date
    ? labReport.reportDate.toISOString()
    : new Date(labReport.reportDate).toISOString()
  const collectionDate = labReport.collectionDate
    ? labReport.collectionDate instanceof Date
      ? labReport.collectionDate.toISOString()
      : new Date(labReport.collectionDate).toISOString()
    : null

  const canonical = {
    reportNumber: labReport.reportNumber || '',
    patientId: objectIdToString(labReport.patientId),
    labId: labReport.labId ? objectIdToString(labReport.labId) : '',
    orderedByDoctorId: labReport.orderedByDoctorId ? objectIdToString(labReport.orderedByDoctorId) : null,
    collectionDate,
    reportDate,
    results: (labReport.results || [])
      .map((result) => ({
        loinc: result.loincCode || '',
        testName: result.testName || '',
        value: String(result.value ?? ''),
        unit: result.unit || '',
      }))
      .sort((a, b) => (a.loinc || a.testName).localeCompare(b.loinc || b.testName)),
  }

  return JSON.stringify(canonical)
}
