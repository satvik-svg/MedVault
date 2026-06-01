import crypto from 'crypto'

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function sha256HexPrefixed(input: string): string {
  return `0x${sha256Hex(input)}`
}

export function canonicalizePrescription(prescription: Record<string, any>): string {
  const canonical = {
    prescriptionNumber: prescription.prescriptionNumber || '',
    patientId: String(prescription.patientId || ''),
    doctorId: String(prescription.doctorId || ''),
    clinicId: String(prescription.clinicId || ''),
    createdAt: new Date(prescription.createdAt).toISOString(),
    diagnosis: (prescription.diagnosis || [])
      .map((diagnosis: Record<string, any>) => ({ icd10: diagnosis.icd10Code, primary: !!diagnosis.isPrimary }))
      .sort((a: Record<string, any>, b: Record<string, any>) => String(a.icd10).localeCompare(String(b.icd10))),
    medications: (prescription.medications || [])
      .map((medication: Record<string, any>) => ({
        cui: medication.rxnormCui,
        strength: medication.strength || '',
        form: medication.form || '',
        route: medication.route || '',
        frequency: medication.dosage?.frequency || '',
        duration: `${medication.dosage?.duration?.value || 0}${medication.dosage?.duration?.unit || 'DAYS'}`,
      }))
      .sort((a: Record<string, any>, b: Record<string, any>) => String(a.cui).localeCompare(String(b.cui))),
    labOrders: (prescription.labOrders || []).map((order: Record<string, any>) => order.loincCode || order.displayName || '').sort(),
  }
  return JSON.stringify(canonical)
}

export function canonicalizeLabReport(labReport: Record<string, any>): string {
  const canonical = {
    reportNumber: labReport.reportNumber || '',
    patientId: String(labReport.patientId || ''),
    labId: String(labReport.labId || ''),
    orderedByDoctorId: labReport.orderedByDoctorId ? String(labReport.orderedByDoctorId) : null,
    collectionDate: labReport.collectionDate ? new Date(labReport.collectionDate).toISOString() : null,
    reportDate: new Date(labReport.reportDate).toISOString(),
    results: (labReport.results || [])
      .map((result: Record<string, any>) => ({
        loinc: result.loincCode || '',
        testName: result.testName || '',
        value: String(result.value ?? ''),
        unit: result.unit || '',
      }))
      .sort((a: Record<string, any>, b: Record<string, any>) => (
        String(a.loinc || a.testName).localeCompare(String(b.loinc || b.testName))
      )),
  }
  return JSON.stringify(canonical)
}
