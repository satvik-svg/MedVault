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
