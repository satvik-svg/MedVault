export {
  patientSignup,
  verifyOtpAndCreatePatient,
  doctorSignup,
  clinicSignup,
  login,
  completeFirstTimeLogin,
  refreshTokens,
  logout,
} from './auth.service.ts'
export {
  onboardDoctorByAdmin,
  sendDoctorCredentials,
  onboardLabByAdmin,
  sendLabCredentials,
  initiatePatientQuickRegister,
  completePatientQuickRegister,
} from './onboarding.service.ts'
export { searchDrugs, lookupDrugByCui } from './drug-lookup.service.ts'
export { runMedicationSafetyChecks, hasBlockingSafetyIssue } from './safety-checks.service.ts'
export type { MedicationInput, MedicationSafetyResult } from './safety-checks.service.ts'
export { checkOrRequestConsent, resolveConsentRequest, assertActiveConsent } from './consent.service.ts'
export type { ConsentDecision, ConsentScope } from './consent.service.ts'
export { createVisit, updateVisit, listDoctorVisits, listPatientVisits } from './visit.service.ts'
export { createPrescription, listPatientPrescriptions, checkMedicationForPrescription, cleanupExpiredMedications, updatePatientActiveMedications, SafetyCheckError } from './prescription.service.ts'
export type { CreatePrescriptionInput } from './prescription.service.ts'
export { uploadStructuredLabReport, listPatientLabReports, saveExternalLabUpload, detectAbnormalities } from './lab.service.ts'
export type { LabResultInput } from './lab.service.ts'
export { discoverLabs } from './lab-discovery.service.ts'
export {
  createLabOrder,
  listPendingLabOrders,
  listPatientLabOrders,
  updateLabOrderStatus,
  markPatientUsingAlternateLab,
  uploadLabOrderReport,
} from './lab-order.service.ts'
export { deliverLabReportToDoctor } from './lab-report-delivery.service.ts'
export { buildPatientTimeline, buildPatientSummary } from './patient-summary.service.ts'
export { generateEmergencyQR, revokeEmergencyQR, scanEmergencyQR, sweepExpiredEmergencyQRs, GeoAnomalyError } from './emergency-qr.service.ts'
export { uploadExternalPrescription, confirmExternalPrescription } from './external-prescription.service.ts'
export { verifyPrescriptionAnchoring } from './blockchain-verification.service.ts'
export { aiClient, AIClient } from './ai-client.service.ts'
