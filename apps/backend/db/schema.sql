CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'LAB_OPERATOR', 'PLATFORM_ADMIN')),
  patient_id UUID,
  doctor_id UUID,
  lab_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  medvault_id TEXT NOT NULL UNIQUE,
  abha_id TEXT UNIQUE,
  abha_address TEXT,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('M', 'F', 'O')),
  blood_group TEXT,
  contact JSONB NOT NULL DEFAULT '{}'::jsonb,
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  chronic_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  onboarding JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  nmc_reg_number TEXT NOT NULL UNIQUE,
  state_medical_council TEXT,
  specializations JSONB NOT NULL DEFAULT '[]'::jsonb,
  qualifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  practice JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification JSONB NOT NULL DEFAULT '{}'::jsonb,
  trust_level TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  gstin TEXT UNIQUE,
  nabl_accreditation_number TEXT,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  tests_offered JSONB NOT NULL DEFAULT '[]'::jsonb,
  trust_level TEXT NOT NULL DEFAULT 'PENDING',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verification JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'CHECKED_IN' CHECK (status IN ('CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED')),
  type TEXT NOT NULL DEFAULT 'WALK_IN',
  chief_complaint TEXT,
  pre_visit_symptoms JSONB NOT NULL DEFAULT '{}'::jsonb,
  doctor_notes TEXT,
  prescription_id UUID,
  lab_order_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number TEXT UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  visit_id UUID REFERENCES visits(id),
  diagnosis JSONB NOT NULL DEFAULT '[]'::jsonb,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  lab_orders JSONB NOT NULL DEFAULT '[]'::jsonb,
  blockchain JSONB NOT NULL DEFAULT '{"status":"NOT_QUEUED"}'::jsonb,
  blockchain_tx_hash TEXT,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  visit_id UUID REFERENCES visits(id),
  lab_id UUID REFERENCES labs(id),
  tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'CREATED',
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_estimated_price NUMERIC(12,2),
  lab_report_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  lab_id UUID REFERENCES labs(id),
  lab_order_id UUID REFERENCES lab_orders(id),
  ordered_by_doctor_id UUID REFERENCES doctors(id),
  source TEXT NOT NULL DEFAULT 'MEDVAULT_NATIVE_LAB_PARTNER',
  file_url TEXT,
  file_type TEXT,
  collection_date TIMESTAMPTZ,
  report_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_abnormal_values BOOLEAN NOT NULL DEFAULT FALSE,
  has_critical_values BOOLEAN NOT NULL DEFAULT FALSE,
  structured_data JSONB,
  ai_confidence NUMERIC(5,4),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  blockchain JSONB NOT NULL DEFAULT '{"status":"NOT_QUEUED"}'::jsonb,
  blockchain_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  patient_id UUID REFERENCES patients(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rxnorm_cui TEXT UNIQUE,
  generic_name TEXT NOT NULL,
  brand_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  indian_brand_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  drug_class TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a_cui TEXT NOT NULL,
  drug_b_cui TEXT NOT NULL,
  severity TEXT NOT NULL,
  clinical_effect TEXT,
  management TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drug_a_cui, drug_b_cui)
);

CREATE INDEX IF NOT EXISTS idx_patients_medvault_id ON patients (medvault_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_started ON visits (patient_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_doctor_started ON visits (doctor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_status ON lab_orders (lab_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_date ON lab_reports (patient_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_patient_created ON access_logs (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  grantee_user_id UUID NOT NULL,
  grantee_type TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '[]'::jsonb,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  grant_method TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  nonce TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  grantee_user_id UUID NOT NULL,
  grantee_type TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '[]'::jsonb,
  purpose TEXT NOT NULL DEFAULT 'OTHER',
  status TEXT NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  nonce TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hpr_id TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS languages JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_affiliations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS onboarding JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS preferred_lab_ids UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE labs ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS trade_license_url TEXT;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS premises_photo_url TEXT;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS operating_hours JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS sample_collection_hours JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS holiday_dates JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS home_collection_available BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS home_collection_charge DOUBLE PRECISION;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS home_collection_cities JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS operator_user_ids UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE labs ADD COLUMN IF NOT EXISTS onboarding JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS commercial JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE visits ADD COLUMN IF NOT EXISTS consultation_fee DOUBLE PRECISION;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'MEDVAULT_NATIVE';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ISSUED';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS drugs JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS diagnosis_text TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS follow_up JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS verification_qr JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS ai_assistance JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS is_expired BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS external_upload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS void_reason TEXT;

ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS prescription_id UUID;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS home_collection_requested BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS home_collection_address TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS preferred_collection_time TIMESTAMPTZ;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS patient_went_to_alternate_lab BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS alternate_lab_name TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS commercial JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS uploaded_by_operator_user_id UUID;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS prescription_id UUID;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS ocr_text TEXT;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS external_upload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS consent_id UUID;
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS geo_country TEXT;
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS geo_city TEXT;

ALTER TABLE ref_drugs ADD COLUMN IF NOT EXISTS atc_code TEXT;
ALTER TABLE ref_drugs ADD COLUMN IF NOT EXISTS common_strengths JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ref_drugs ADD COLUMN IF NOT EXISTS forms JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ref_drugs ADD COLUMN IF NOT EXISTS routes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ref_drugs ADD COLUMN IF NOT EXISTS pregnancy_category TEXT;
ALTER TABLE ref_drugs ADD COLUMN IF NOT EXISTS renal_dose_adjust JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE ref_drugs ADD COLUMN IF NOT EXISTS hepatic_dose_adjust JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE ref_drugs ADD COLUMN IF NOT EXISTS interacting_classes JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ref_interactions ADD COLUMN IF NOT EXISTS mechanism TEXT;
ALTER TABLE ref_interactions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'CURATED';

CREATE INDEX IF NOT EXISTS idx_consents_patient_grantee_status ON consents (patient_id, grantee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_consent_requests_patient_grantee_status ON consent_requests (patient_id, grantee_user_id, status);
