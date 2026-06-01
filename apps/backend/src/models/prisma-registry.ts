import { makeModel } from './prisma-adapter.ts'

const commonTimestamps = ['createdAt', 'updatedAt']

export const User = makeModel({
  delegate: 'user',
  fields: [
    'id', 'phoneNumber', 'email', 'passwordHash', 'role', 'patientId', 'doctorId', 'labId',
    'mustChangePassword', 'isPhoneVerified', 'isEmailVerified', 'isActive', 'isLocked',
    'lastLoginAt', 'failedLoginAttempts', 'twoFactorEnabled', 'twoFactorSecret', 'deletedAt',
    ...commonTimestamps,
  ],
})

export const Patient = makeModel({
  delegate: 'patient',
  fields: [
    'id', 'userId', 'medvaultId', 'abhaId', 'abhaAddress', 'fullName', 'dateOfBirth', 'sex',
    'bloodGroup', 'contact', 'allergies', 'chronicConditions', 'activeMedications',
    'emergencyContact', 'onboarding', 'stats', 'deletedAt', ...commonTimestamps,
  ],
})

export const Doctor = makeModel({
  delegate: 'doctor',
  fields: [
    'id', 'userId', 'fullName', 'photoUrl', 'nmcRegNumber', 'stateMedicalCouncil', 'hprId',
    'specializations', 'qualifications', 'languages', 'yearsExperience', 'practice',
    'hospitalAffiliations', 'verification', 'onboarding', 'preferredLabIds', 'trustLevel',
    'stats', 'isActive', 'deletedAt', ...commonTimestamps,
  ],
})

export const Lab = makeModel({
  delegate: 'lab',
  fields: [
    'id', 'legalName', 'displayName', 'phone', 'email', 'website', 'logoUrl', 'gstin',
    'nablAccreditationNumber', 'tradeLicenseUrl', 'premisesPhotoUrl', 'address',
    'operatingHours', 'sampleCollectionHours', 'holidayDates', 'homeCollectionAvailable',
    'homeCollectionCharge', 'homeCollectionCities', 'testsOffered', 'operatorUserIds',
    'verification', 'trustLevel', 'onboarding', 'stats', 'commercial', 'isActive',
    'deletedAt', ...commonTimestamps,
  ],
})

export const Visit = makeModel({
  delegate: 'visit',
  fields: [
    'id', 'patientId', 'doctorId', 'startedAt', 'endedAt', 'status', 'type', 'chiefComplaint',
    'preVisitSymptoms', 'doctorNotes', 'prescriptionId', 'labOrderIds', 'consultationFee',
    'paymentStatus', 'paymentMethod', 'createdBy', 'cancelledAt', 'cancelReason',
    ...commonTimestamps,
  ],
})

export const Prescription = makeModel({
  delegate: 'prescription',
  fields: [
    'id', 'patientId', 'doctorId', 'visitId', 'prescriptionNumber', 'source', 'status',
    'diagnosis', 'medications', 'drugs', 'diagnosisText', 'notes', 'labOrders', 'followUp',
    'pdfUrl', 'verificationQR', 'blockchain', 'aiAssistance', 'validUntil', 'isExpired',
    'externalUpload', 'attachmentUrls', 'blockchainTxHash', 'issuedAt', 'expiresAt',
    'deletedAt', 'voidedAt', 'voidReason', ...commonTimestamps,
  ],
})

export const LabOrder = makeModel({
  delegate: 'labOrder',
  fields: [
    'id', 'patientId', 'doctorId', 'visitId', 'prescriptionId', 'labId', 'orderNumber',
    'tests', 'totalEstimatedPrice', 'homeCollectionRequested', 'homeCollectionAddress',
    'preferredCollectionTime', 'status', 'statusHistory', 'labReportId',
    'patientWentToAlternateLab', 'alternateLabName', 'commercial', 'expiresAt',
    ...commonTimestamps,
  ],
})

export const LabReport = makeModel({
  delegate: 'labReport',
  fields: [
    'id', 'patientId', 'uploadedByUserId', 'labId', 'labOrderId', 'uploadedByOperatorUserId',
    'orderedByDoctorId', 'prescriptionId', 'reportNumber', 'source', 'fileUrl', 'fileType',
    'collectionDate', 'reportDate', 'category', 'results', 'hasAbnormalValues',
    'hasCriticalValues', 'attachmentUrls', 'ocrText', 'structuredData', 'aiConfidence',
    'isVerified', 'verifiedBy', 'externalUpload', 'blockchain', 'blockchainTxHash',
    'deletedAt', ...commonTimestamps,
  ],
})

export const Consent = makeModel({
  delegate: 'consent',
  fields: [
    'id', 'patientId', 'granteeUserId', 'granteeType', 'scope', 'grantedAt', 'expiresAt',
    'status', 'grantMethod', 'revokedAt', 'revokedReason', 'nonce', ...commonTimestamps,
  ],
})

export const ConsentRequest = makeModel({
  delegate: 'consentRequest',
  fields: [
    'id', 'patientId', 'granteeUserId', 'granteeType', 'scope', 'purpose', 'status',
    'expiresAt', 'resolvedAt', 'nonce', ...commonTimestamps,
  ],
})

export const AccessLog = makeModel({
  delegate: 'accessLog',
  fields: [
    'id', 'actorUserId', 'actorRole', 'action', 'targetType', 'targetId', 'patientId',
    'consentId', 'ip', 'userAgent', 'geoCountry', 'geoCity', 'metadata', 'createdAt',
  ],
})

export const RefDrug = makeModel({
  delegate: 'refDrug',
  fields: [
    'id', 'rxnormCui', 'genericName', 'brandNames', 'indianBrandNames', 'drugClass',
    'atcCode', 'commonStrengths', 'forms', 'routes', 'pregnancyCategory', 'renalDoseAdjust',
    'hepaticDoseAdjust', 'interactingClasses', 'createdAt',
  ],
})

export const RefInteraction = makeModel({
  delegate: 'refInteraction',
  fields: [
    'id', 'drug1Cui', 'drug2Cui', 'severity', 'mechanism', 'clinicalEffect', 'management',
    'source', 'createdAt',
  ],
})

Doctor.config.relations = { preferredLabIds: { model: Lab, isArray: true }, userId: { model: User } }
Lab.config.relations = { operatorUserIds: { model: User, isArray: true } }
Visit.config.relations = { patientId: { model: Patient }, doctorId: { model: Doctor }, prescriptionId: { model: Prescription } }
Prescription.config.relations = { patientId: { model: Patient }, doctorId: { model: Doctor }, visitId: { model: Visit } }
LabOrder.config.relations = { patientId: { model: Patient }, doctorId: { model: Doctor }, labId: { model: Lab }, labReportId: { model: LabReport }, visitId: { model: Visit } }
LabReport.config.relations = { patientId: { model: Patient }, labId: { model: Lab }, orderedByDoctorId: { model: Doctor } }
