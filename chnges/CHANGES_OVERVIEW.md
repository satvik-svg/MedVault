# MedVault Migration Analysis — From v1 (Built) to v2 (Real Product)

You've built all 5 phases. The product direction has shifted significantly. This doc tells you **what to keep, what to throw away, and what to add**, before going phase-by-phase.

---

## TL;DR — How Much Rework Are We Talking About?

| Phase | What you built | Rework needed | Severity |
|---|---|---|---|
| Phase 1 — Foundation | Clinic + Doctor + ClinicAdmin entities with HFR/GST/domain verification | Drop ClinicAdmin role + clinic verification; simplify Doctor; ADD Lab entity + LabOperator role | **Heavy** |
| Phase 2 — Records Flow | Appointments + Prescriptions + Pharmacy QR + Lab uploads | Drop appointments → Visit model; Drop pharmacy entirely; ADD LabOrder + lab picker | **Heavy** |
| Phase 3 — AI Layer | Whisper, NER, classifier, LLM, recurrence | **No structural changes** — only minor input adjustments | **None** |
| Phase 4 — OCR + Blockchain | OCR pipeline + Polygon contract + BullMQ | **No structural changes** — OCR becomes more important; blockchain unchanged | **None** |
| Phase 5 — Frontend + Emergency QR + Deployment | Patient/Doctor/Clinic Admin UIs + Emergency QR + Pharmacy UI + Eval | Drop Emergency QR (Contribution 5 cut); Drop ClinicAdmin UI + Pharmacy UI; ADD Lab portal + Lab picker UI; Rebuild patient summary view | **Heavy** |

**Estimate:** ~30% of code needs rework. The AI and blockchain layers are safe. Most rework is in entity model + records flow + frontend.

---

## What Changed (The Story)

### 1. Clinic admin role is gone

**Why:** In India, most doctors run their own clinics or work at hospitals where there's no dedicated "clinic admin." Forcing this role created friction and didn't match reality.

**What this means:**
- No more `CLINIC_ADMIN` user role
- No clinic-admin signup, dashboard, doctor-approval UI
- No bilateral doctor-clinic affiliation confirmation dance
- Clinic auto-verification (HFR + GST + domain) all dropped
- "Clinic" becomes a lightweight free-text field on the Doctor, not a verified entity

### 2. Doctor onboarding is assisted, not self-service

**Why:** Doctors don't have time to fill long signup forms. Real onboarding happens via field rep visiting clinic, or doctor's existing staff registers them.

**What this means:**
- New "Assisted Onboarding" flow where MedVault staff (anyone with admin access) fills the doctor's form
- Doctor only logs in afterward to verify and start using
- No HFR-style auto-verification — just manual NMC cert review by platform admin

### 3. Pharmacy is gone entirely

**Why:** Indian medical stores will not adopt your platform. Patient gets prescription PDF, walks to any medical store, store dispenses. End of MedVault's involvement.

**What this means:**
- Drop `PHARMACY_OPERATOR` role
- Drop pharmacy fulfillment flow
- Drop pharmacy QR scanning
- Drop pharmacy-side UI
- Keep: the verification QR on prescription PDFs (anyone can verify, but no app needed)

### 4. Lab becomes a partner marketplace

**Why:** Labs are independent businesses. Doctors send patients to specific labs. Currently it's paper-based; you can digitize the referral + report flow.

**What this means:**
- Add `Lab` as a verified entity (separate from old "Clinic" — labs are distinct)
- Add `LabOperator` user role
- Add `LabOrder` entity (the referral artifact)
- Doctor picks lab from a curated list during consultation
- Lab portal receives order, lab uploads report digitally
- Patient sees order in their app, can also choose a different lab if they want
- Commercial model (per-referral fee) deferred to v2 — pilot is free

### 5. Appointment booking is gone

**Why:** Indian clinics don't use online booking widely. Patients walk in.

**What this means:**
- Drop appointment slot management, availability calendars, booking flow
- Replace with `Visit` — created when patient arrives at clinic
- Doctor's assistant or doctor themselves clicks "New visit" + scans/enters patient ID
- Pre-visit symptom recording becomes "record symptoms before visit" (any time, not tied to a slot)

### 6. Emergency QR is cut (Contribution 5 gone)

**Why:** No emergency responder in India will know to scan a "MedVault emergency QR." It was a cool research idea that doesn't survive the "real users do this" test.

**What this means:**
- Drop entire emergency QR subsystem (generation, scan, geo-anomaly, revocation, notifications)
- Drop emergency QR evaluation
- **You now have 4 research contributions, not 5:** CDS pipeline, Whisper LoRA, OCR pipeline, Verification + Blockchain

### 7. Walk-in patient registration by doctor's staff

**Why:** Patients won't pre-install MedVault. They walk in cold. The clinic needs to onboard them in 60 seconds.

**What this means:**
- Doctor (or their assistant if they have one) can quick-register a patient during the visit
- Patient enters OTP from WhatsApp on the spot
- Profile completion deferred — patient finishes from their own phone later

---

## What Stays (The Survivors)

These don't change. Don't touch the code:

### Phase 1
- User schema (minus role enum change)
- Patient schema entirely
- JWT auth with access + refresh tokens
- OTP-via-WhatsApp signup for patients
- bcrypt password auth for doctors
- AES-256-GCM encryption at rest
- AccessLog schema
- RBAC middleware (just remove CLINIC_ADMIN from role checks)
- Reference data seeding (RxNorm, ICD-10, LOINC, Indian brands, drug interactions)

### Phase 2
- Tiered consent system (explicit / auto-renew / emergency-context — emergency context now just means "first visit no prior consent")
- Drug autocomplete service with fuzzy matching
- Structured Prescription schema (with minor field cleanup)
- All 4 safety checks (allergy, DDI, duplicate therapy, renal/hepatic)
- Prescription PDF generation via Puppeteer
- Patient timeline API
- Patient summary endpoint (basic — AI additions from Phase 3 stay)

### Phase 3 — ALL OF IT
- FastAPI AI service
- faster-whisper baseline + LoRA training scripts
- Bio_ClinicalBERT NER + scispacy UMLS linking
- DDXPlus classifier + India reweighting + isotonic calibration
- Red flag detector
- LLM patient summary
- Symptom recurrence with FAISS
- All endpoint wiring to backend

### Phase 4 — ALL OF IT (more important now)
- OCR preprocessing → YOLO regions → TrOCR/Vision → LLM extract → RxNorm/India normalize
- OCR confidence aggregation + user verification UI
- PrescriptionAudit smart contract on Polygon Amoy
- BullMQ async anchoring worker
- Canonical hashing + retry/dead-letter
- Verification endpoint for tamper detection

### Phase 5
- Design system + color palette + typography
- TrustBadge component (now doctor-level only, not clinic-level)
- BlockchainBadge component
- Doctor's PrescriptionForm with real-time safety checks
- Most patient app screens
- PWA + offline strategy
- Auth flow + API client
- Deployment infrastructure (Vercel/Railway/HF Spaces/Atlas/R2)
- Evaluation suite for contributions 1-4

---

## What Needs Rework

### Critical changes (schema/data migrations)

1. **Drop `CLINIC_ADMIN`, `PHARMACY_OPERATOR` from User role enum**
   - Migration: any existing users with these roles need to be deactivated or remapped
   - In production data: probably few-to-none since you haven't launched
2. **Drop `Pharmacy`, `Lab as clinic type` from Clinic schema** OR drop Clinic entirely → DoctorPractice
   - Migration: existing clinic records → migrate `displayName`, `address` into `Doctor.practice` field
3. **Add `Lab` entity** with verification, operators, hours, test catalog
4. **Add `LabOperator` to User role enum**
5. **Add `LabOrder` entity** linking prescription → lab → report
6. **Drop `Appointment` entity** → replace with `Visit`
7. **Simplify `Doctor.affiliations`** from bilateral-confirmation array to free-text array
8. **Drop `EmergencyQR` entity** and `Patient.activeEmergencyQrNonces` field

### Service code changes

1. **`VerificationService`** — strip out HFR/GST/domain for clinic; keep only NMC manual review for doctor; add new Lab verification flow
2. **`AppointmentService`** — delete or repurpose as `VisitService`
3. **`PharmacyFulfillmentService`** — delete
4. **`EmergencyQRService`** — delete
5. **`LabReportService`** — extend: now receives orders from `LabOrder`, lab operator posts back
6. **NEW: `LabService`** — lab CRUD, lab discovery (search by city + open now + favorites)
7. **NEW: `LabOrderService`** — order creation, status tracking, report delivery

### Frontend changes

1. **Delete:** clinic admin dashboard, doctor affiliation request UI, pharmacy scan UI, emergency QR screens
2. **Rebuild:** doctor's patient summary view (the brain-dead simple at-a-glance view)
3. **New:** lab operator portal (orders queue + report upload + history)
4. **New:** lab picker component (used by doctor when ordering tests)
5. **New:** "assisted onboarding" forms for staff to register doctors/patients

---

## What Gets Added That's Truly New

### Lab marketplace MVP

This is the biggest net-new chunk. Scoping it sensibly:

**v1 (must build):**
- Lab entity + verification
- LabOperator role + auth
- Lab portal: orders queue + report upload (structured OR PDF + OCR fallback)
- LabOrder lifecycle (created → acknowledged → sample collected → in progress → report uploaded → delivered)
- Lab discovery (search by city + currently-open + doctor favorites)
- Doctor's "Order Tests" flow integrates lab picker
- Patient sees ordered tests with selected lab info + map link
- Report delivery: WhatsApp PDF to patient + auto-attach to ordering doctor's view

**v2 (defer):**
- Commercial model (per-referral fees, payment reconciliation, payouts)
- Lab ratings / reviews
- Home sample collection scheduling
- Lab inventory of tests with real-time pricing
- Lab-side analytics dashboard
- Multi-doctor referral attribution

**Why v2 deferred:** All the v2 stuff is business plumbing, not product plumbing. Pilot with one lab on a free basis to validate the flow, then layer commercial on top once it works.

### Doctor's quick-glance patient view

The most-built-fastest-throw-away thing you have right now is probably the doctor's patient summary screen. Old version was rich and tabbed. New version is **one scroll, decision-grade information at a glance**.

Spec for the new view (rebuild from scratch — don't try to preserve old code):
- Top strip: name, age, sex, MV ID, visit count with you, last visit
- Critical band: allergies + chronic conditions + active meds (red/yellow background)
- Last 3 visits table (date, doctor name, primary diagnosis)
- Latest abnormal labs with sparkline trends
- AI pre-visit panel (if patient recorded symptoms)
- 3 buttons: "Write Prescription" / "Order Tests" / "Full History"

Everything else moved to "Full History" page (which is fine to be tabbed and deep).

### Assisted onboarding flows

You had self-signup. Now you need staff-assisted variants:
- **Doctor:** sales rep or doctor's assistant fills form → submits for platform admin review → doctor gets login credentials via WhatsApp once approved
- **Patient (in-clinic):** receptionist enters phone + name → patient reads OTP aloud → MV ID generated → doctor proceeds immediately, patient finishes profile later
- **Lab:** sales rep or lab owner fills form → submits for platform admin review → lab gets login credentials once approved

---

## Migration Strategy — How To Actually Do This

If you've fully implemented v1 already, don't delete code wholesale. Instead, work in this order:

### Step 1 (1 week): Tag the v1 build

```bash
git tag v1.0.0-research-prototype
git push --tags
```

This preserves what you have for your paper's "synthetic evaluation" section. The research story for v1 is intact; the paper can reference v1.0.0.

### Step 2 (2 weeks): Schema migration

1. Write a migration script that:
   - Deactivates `CLINIC_ADMIN` and `PHARMACY_OPERATOR` users (mark `isActive: false`)
   - Migrates clinic display info into `Doctor.practice` field (or new `DoctorPractice` subdoc)
   - Drops appointment collection entirely
   - Drops emergency QR collection entirely
2. Add new collections: `labs`, `laborders`
3. Add migrations for `Patient`, `Doctor`, `Prescription` schema field changes

For a project that hasn't launched, you can also just **wipe the DB and reseed**. Simpler than migration code. Recommended.

### Step 3 (4-5 weeks): Backend rework

In this order (each depends on the previous):
1. Auth + RBAC: remove dropped roles, no impact on existing patient/doctor flows
2. Verification service: simplify (no HFR/GST/domain for clinic; keep NMC manual review)
3. Drop `AppointmentService`, `PharmacyFulfillmentService`, `EmergencyQRService`
4. Add `VisitService` (basically what appointment was, minus slots/booking)
5. Add `LabService`, `LabOrderService`, `LabPickerService` (discovery)
6. Update `PrescriptionService` to integrate `LabOrder` for the "order tests" sub-flow
7. Update notifications: drop emergency QR alerts, add lab order WhatsApp templates

### Step 4 (3-4 weeks): Frontend rework

1. Delete: clinic admin pages, pharmacy pages, emergency QR pages
2. Rebuild: doctor's patient summary screen (the brain-dead simple view)
3. Build: lab operator portal
4. Build: lab picker component
5. Build: assisted onboarding forms (doctor + patient quick-register)
6. Update all existing screens to remove references to deleted roles

### Step 5 (1 week): Phase 3 + 4 verification

Run all AI evaluations and blockchain tests against the new entity model.
- AI service shouldn't change at all — verify by running existing eval scripts
- Blockchain: confirm canonical hashing still works for prescriptions (no schema field used in hash should have changed)
- Decide: do you want to hash LabReport too? Recommend yes (it's a doctor-issued artifact like prescriptions)

### Step 6 (1-2 weeks): New evaluation + Paper update

- Remove emergency QR evaluation entirely
- Re-run all other contribution evaluations on v2 schema (should be unchanged)
- Update paper: drop Contribution 5, narrative shifts from "research demo" to "deployed pilot"
- Add real-usage metrics from pilot (will fill in during/after pilot)

### Step 7 (parallel from week 1): Find pilot doctor + pilot lab

Don't wait. Start finding partners NOW. You'll need:
- 1 pilot doctor (single practitioner ideal)
- 1 pilot lab in same city as pilot doctor
- 5-10 willing patients (doctor's existing patients in trial mode)

---

## Total Timeline Estimate

| Activity | Duration |
|---|---|
| Tag v1, plan migrations | 1 week |
| Backend rework (Phase 1 + 2 changes) | 4-5 weeks |
| Frontend rework (Phase 5 changes) | 3-4 weeks |
| Lab marketplace build (net new) | 3 weeks (overlaps with frontend) |
| Phase 3/4 verification + paper update | 1-2 weeks |
| Pilot prep + onboarding materials | 1 week |
| Internal testing + bug fixing | 2 weeks |
| **TOTAL** | **~3-4 months of focused work** |

If you have 6 months left in your 6-month timeline, this works with breathing room for the pilot (months 5-6).

If you have less than 4 months, you need to cut scope on the lab marketplace (defer the order flow, just keep lab as report uploader).

---

## What Doesn't Change About Your Paper

Even after dropping Contribution 5, the paper is still strong:

1. **Clinical Decision Support Pipeline** (NER + DDXPlus + India reweighting + calibration + red flags) — unchanged
2. **Voice Symptom Intake** (Whisper LoRA Indian medical English) — unchanged
3. **Region-Aware Hybrid OCR for Handwritten Prescriptions and Lab Reports** — actually STRONGER now because labs that aren't on MedVault will still get their reports digitized via OCR. More use cases.
4. **Verification Framework + Blockchain Audit** — unchanged for prescriptions; consider extending hash to LabReport for stronger coverage

**New narrative for the paper:** "We built MedVault, a clinic-side digital health record platform deployed in pilot with N doctors, M patients, and L lab partners. Our four technical contributions enable…"

This is a **stronger** paper than "we built a research demo with 5 contributions." Real usage data > synthetic evaluation, every time.

---

## Open Questions Still to Decide

These will affect the change docs that follow:

1. **Lab marketplace scope in v1:** full portal vs. just report uploader vs. defer entirely?
2. **Doctor opt-in:** must use for all consultations or some?
3. **First pilot doctor:** identified or still searching? (Critical — your scope depends on what they need)
4. **NABL accreditation** for lab verification: required or optional?
5. **Commercial model timing:** v1 free, v2 commercial, or v1 free for first N labs?

These are answered in the per-phase change docs that follow, but flag them now so you know what's open.

---

## Next: Per-Phase Change Memos

The files that follow tell you, phase-by-phase, the exact changes:

- `changes_phase_1_foundation.md` — Schema drops, schema adds, role enum changes, verification service simplification
- `changes_phase_2_records_flow.md` — Drop appointments + pharmacy, add Visit + LabOrder + Lab picker
- `changes_phase_3_ai_layer.md` — Minor tweaks only (mostly "no changes")
- `changes_phase_4_ocr_blockchain.md` — No structural changes, optional: extend hashing to LabReport
- `changes_phase_5_frontend_security_deployment.md` — Drop emergency QR + clinic admin + pharmacy UI; add lab portal + new patient summary view

Read in order. Each is self-contained for that phase's rework.
