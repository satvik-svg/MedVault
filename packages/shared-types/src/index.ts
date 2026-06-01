export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  LAB_OPERATOR = 'LAB_OPERATOR',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export enum TrustLevel {
  VERIFIED = 'VERIFIED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

export enum Sex {
  M = 'M',
  F = 'F',
  O = 'O',
}

export enum BloodGroup {
  A_POS = 'A+',
  A_NEG = 'A-',
  B_POS = 'B+',
  B_NEG = 'B-',
  AB_POS = 'AB+',
  AB_NEG = 'AB-',
  O_POS = 'O+',
  O_NEG = 'O-',
  UNKNOWN = 'UNKNOWN',
}

export enum AllergyType {
  DRUG = 'DRUG',
  FOOD = 'FOOD',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  OTHER = 'OTHER',
}

export enum AllergySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  ANAPHYLACTIC = 'ANAPHYLACTIC',
}

export enum ConditionStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  IN_REMISSION = 'IN_REMISSION',
}

export enum ConsentScope {
  FULL = 'FULL',
  PRESCRIPTIONS = 'PRESCRIPTIONS',
  LAB_REPORTS = 'LAB_REPORTS',
  DIAGNOSES = 'DIAGNOSES',
  ALLERGIES_AND_CONDITIONS = 'ALLERGIES_AND_CONDITIONS',
  DEMOGRAPHICS = 'DEMOGRAPHICS',
}

export enum ConsentStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  AUTO_RENEWED = 'AUTO_RENEWED',
}

export enum GrantMethod {
  EXPLICIT_WHATSAPP = 'EXPLICIT_WHATSAPP',
  AUTO_RECENT_DOCTOR = 'AUTO_RECENT_DOCTOR',
}

export enum ManualReviewStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum VerificationMethod {
  AUTO_API = 'AUTO_API',
  MANUAL_DOCUMENT_REVIEW = 'MANUAL_DOCUMENT_REVIEW',
}

export enum AdherenceScore {
  GOOD = 'GOOD',
  MODERATE = 'MODERATE',
  POOR = 'POOR',
}

export enum DocumentType {
  REGISTRATION = 'REGISTRATION',
  DOCTOR_DEGREE = 'DOCTOR_DEGREE',
  OWNERSHIP = 'OWNERSHIP',
  OTHER = 'OTHER',
}

export enum AccessAction {
  VIEW_PATIENT = 'VIEW_PATIENT',
  CREATE_PRESCRIPTION = 'CREATE_PRESCRIPTION',
  VIEW_PRESCRIPTION = 'VIEW_PRESCRIPTION',
  UPLOAD_LAB = 'UPLOAD_LAB',
  VIEW_LAB = 'VIEW_LAB',
  CONSENT_REQUEST = 'CONSENT_REQUEST',
  CONSENT_GRANT = 'CONSENT_GRANT',
  CONSENT_REVOKE = 'CONSENT_REVOKE',
  BLOCKCHAIN_VERIFY = 'BLOCKCHAIN_VERIFY',
}

export enum PrescriptionSource {
  MEDVAULT_NATIVE = 'MEDVAULT_NATIVE',
  EXTERNAL_OCR = 'EXTERNAL_OCR',
  EXTERNAL_MANUAL_ENTRY = 'EXTERNAL_MANUAL_ENTRY',
}

export enum BlockchainStatus {
  NOT_QUEUED = 'NOT_QUEUED',
  QUEUED = 'QUEUED',
  PENDING = 'PENDING',
  ANCHORED = 'ANCHORED',
  FAILED = 'FAILED',
}

export interface AccessTokenPayload {
  userId: string
  role: UserRole
  patientId?: string
  doctorId?: string
  labId?: string
  trustLevel?: string
}
