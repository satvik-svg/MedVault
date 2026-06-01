# Phase 2 — Core Records Flow: Appointments, Prescriptions, Labs

**Goal:** With Phase 1 entities in place, build the actual medical record creation flow. By end of Phase 2: patient books appointment, doctor scans QR, structured prescription with safety checks gets saved, pharmacy can verify, lab can upload. No AI yet (Phase 3), no blockchain yet (Phase 4) — just the clinical records skeleton.

**Duration:** 2-3 weeks
**Prerequisites:** Phase 1 complete
**Output:** Full record creation flow working end-to-end, drug safety checks operational, PDF generation working

---

## 2.1 Reference Data Setup (Do This First)

Before any feature code, load reference vocabularies into MongoDB. These are static (rarely change), used everywhere.

### Reference collections to populate

```
references/
├── icd10_codes.json           # ICD-10 diagnosis codes
├── loinc_codes.json           # LOINC lab test codes
├── rxnorm_drugs.json          # RxNorm drugs (US standard)
├── india_drugs.json           # CIMS/1mg brand → generic mapping
├── drug_classes.json          # ATC classification
├── drug_interactions.json     # DDI database (from DrugBank/OpenFDA)
└── symptoms_umls.json         # UMLS symptom CUIs for AI normalization
```

### Data sources & how to get them

| Reference | Source | Method |
|---|---|---|
| ICD-10 | WHO public release | Download CSV from icd.who.int |
| LOINC | loinc.org (free with registration) | CSV download |
| RxNorm | NLM (free) | API or RRF file download from `mor.nlm.nih.gov/RxNorm` |
| India drugs | CIMS/1mg | Scrape (gray area — document carefully) or use the open `india-drugs-data` GitHub datasets |
| Drug interactions | DrugBank Open + OpenFDA | DrugBank Open CSV (non-commercial) + OpenFDA `/drug/drugsfda` |
| UMLS symptoms | UMLS Metathesaurus | Requires UMLS license (free for academic) |

### Schema for reference collections

```typescript
// models/RefDrug.ts
const RefDrugSchema = new Schema({
  rxnormCui: { type: String, unique: true, index: true },
  genericName: { type: String, required: true, index: 'text' },
  brandNames: [{ type: String, index: 'text' }],
  indianBrandNames: [{ 
    brand: String, 
    manufacturer: String,
    formulations: [String]
  }],
  drugClass: String,
  atcCode: String,
  commonStrengths: [String],
  forms: [String],                          // tablet, syrup, injection
  routes: [String],                         // oral, IV, topical
  
  // Safety metadata
  pregnancyCategory: String,
  renalDoseAdjust: { required: Boolean, notes: String },
  hepaticDoseAdjust: { required: Boolean, notes: String },
  
  // For interaction checks
  interactingClasses: [String]
}, { timestamps: false });

RefDrugSchema.index({ genericName: 'text', brandNames: 'text', 'indianBrandNames.brand': 'text' });
```

```typescript
// models/RefInteraction.ts
const RefInteractionSchema = new Schema({
  drug1Cui: { type: String, required: true, index: true },
  drug2Cui: { type: String, required: true, index: true },
  severity: { type: String, enum: ['CONTRAINDICATED', 'SEVERE', 'MODERATE', 'MINOR'] },
  mechanism: String,
  clinicalEffect: String,
  management: String,
  source: { type: String, enum: ['DRUGBANK', 'OPENFDA', 'CURATED'] }
}, { timestamps: false });

RefInteractionSchema.index({ drug1Cui: 1, drug2Cui: 1 }, { unique: true });
```

### Seed scripts

Create `scripts/seed/` directory:

```typescript
// scripts/seed/seed-drugs.ts
async function seedDrugs() {
  const rxnormData = parseCSV('./data/rxnorm.csv');
  const indiaData = parseCSV('./data/india-drugs.csv');
  
  for (const drug of rxnormData) {
    const indianMatches = indiaData.filter(d => 
      d.genericName.toLowerCase() === drug.genericName.toLowerCase()
    );
    
    await RefDrug.upsert({
      rxnormCui: drug.cui,
      genericName: drug.genericName,
      brandNames: drug.brandNames.split('|'),
      indianBrandNames: indianMatches.map(m => ({
        brand: m.brandName,
        manufacturer: m.manufacturer,
        formulations: m.formulations.split('|')
      })),
      // ...
    });
  }
}
```

Run once via `pnpm seed`. Verify counts: ~10,000 RxNorm drugs, ~3000 Indian brand mappings, ~50,000 ICD-10 codes, ~80,000 LOINC codes.

### Important: build the India brand → generic lookup carefully

This is critical for safety checks. When doctor types "Crocin", you need to know it's paracetamol. Build a fuzzy search service:

```typescript
// services/drug-lookup.service.ts
import Fuse from 'fuse.js';

class DrugLookupService {
  private fuse: Fuse<RefDrug>;
  
  async init() {
    const allDrugs = await RefDrug.find().lean();
    this.fuse = new Fuse(allDrugs, {
      keys: [
        { name: 'genericName', weight: 1.0 },
        { name: 'brandNames', weight: 0.8 },
        { name: 'indianBrandNames.brand', weight: 0.9 }    // weight Indian brands high
      ],
      threshold: 0.3,                                       // fuzzy tolerance
      includeScore: true
    });
  }
  
  search(query: string, limit: number = 10) {
    return this.fuse.search(query, { limit }).map(r => ({
      ...r.item,
      matchScore: 1 - r.score!
    }));
  }
}
```

This powers the autocomplete in the prescription form.

---

## 2.2 Appointment System

### Schema

```typescript
// models/Appointment.ts
const AppointmentSchema = new Schema({
  patientId: { type: ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: ObjectId, ref: 'Doctor', required: true, index: true },
  clinicId: { type: ObjectId, ref: 'Clinic', required: true, index: true },
  
  slotStart: { type: Date, required: true, index: true },
  slotEnd: { type: Date, required: true },
  
  status: { 
    type: String, 
    enum: ['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'BOOKED',
    index: true
  },
  
  type: { type: String, enum: ['IN_PERSON', 'TELEMEDICINE', 'FOLLOW_UP'] },
  
  // Patient-side
  chiefComplaint: String,
  preVisitSymptoms: {                           // filled by Phase 3 AI pipeline
    rawText: String,
    audioUrl: String,
    extractedEntities: [Schema.Types.Mixed],
    aiTop3Diagnoses: [Schema.Types.Mixed],
    redFlags: [String]
  },
  
  // Doctor-side
  consultationStartedAt: Date,
  consultationEndedAt: Date,
  doctorNotes: String,                          // encrypted
  prescriptionId: { type: ObjectId, ref: 'Prescription' },
  
  // Financial
  consultationFee: Number,
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'WAIVED'] },
  
  cancelledAt: Date,
  cancelReason: String,
  cancelledBy: { type: String, enum: ['PATIENT', 'DOCTOR', 'CLINIC'] }
}, { timestamps: true });

AppointmentSchema.index({ doctorId: 1, slotStart: 1 });
AppointmentSchema.index({ patientId: 1, slotStart: -1 });
AppointmentSchema.index({ clinicId: 1, slotStart: 1, status: 1 });
```

### Slot management

Each doctor has availability config:

```typescript
// models/DoctorAvailability.ts
const DoctorAvailabilitySchema = new Schema({
  doctorId: { type: ObjectId, ref: 'Doctor', required: true, index: true },
  clinicId: { type: ObjectId, ref: 'Clinic', required: true },
  
  weekday: { type: Number, min: 0, max: 6 },    // 0 = Sunday
  startTime: String,                            // "09:00"
  endTime: String,                              // "13:00"
  slotDurationMinutes: { type: Number, default: 15 },
  
  exceptionDates: [Date],                       // holidays, off-days
  isActive: Boolean
});
```

### Booking flow

```typescript
// services/appointment.service.ts
async function findAvailableSlots(doctorId: string, date: Date, clinicId: string) {
  const weekday = date.getDay();
  const availability = await DoctorAvailability.findOne({ doctorId, clinicId, weekday, isActive: true });
  if (!availability) return [];
  
  // Generate all possible slots
  const slots = generateSlots(date, availability);
  
  // Subtract booked slots
  const booked = await Appointment.find({
    doctorId,
    slotStart: { $gte: startOfDay(date), $lt: endOfDay(date) },
    status: { $nin: ['CANCELLED', 'NO_SHOW'] }
  }).select('slotStart slotEnd');
  
  return slots.filter(s => !booked.some(b => overlaps(s, b)));
}

async function bookAppointment(patientId, doctorId, clinicId, slotStart, type) {
  // Verify doctor is at this clinic
  const doctor = await Doctor.findById(doctorId);
  const affiliation = doctor.affiliations.find(a => 
    a.clinicId.equals(clinicId) && a.isActive && a.confirmedByClinic && a.confirmedByDoctor
  );
  if (!affiliation) throw new Error('Doctor not affiliated with this clinic');
  
  // Verify slot still available
  const slotEnd = addMinutes(slotStart, 15);
  const conflict = await Appointment.findOne({
    doctorId,
    slotStart: { $lt: slotEnd },
    slotEnd: { $gt: slotStart },
    status: { $nin: ['CANCELLED', 'NO_SHOW'] }
  });
  if (conflict) throw new Error('Slot no longer available');
  
  const appointment = await Appointment.create({
    patientId, doctorId, clinicId, slotStart, slotEnd, type,
    status: 'BOOKED'
  });
  
  // Send notifications
  await sendWhatsApp(patient.phone, 
    `Appointment booked with Dr. ${doctor.fullName} at ${formatDate(slotStart)}. ` +
    `Tap to add symptoms in advance: ${appointmentLink}`);
  
  return appointment;
}
```

### Check-in flow

When patient arrives at clinic:

1. Clinic admin or patient marks `CHECKED_IN`
2. Doctor sees patient in queue
3. Doctor opens patient → status → `IN_CONSULTATION`
4. After consultation → `COMPLETED`

---

## 2.3 The Tiered Consent System

This sits between "doctor scans QR" and "patient data loads."

### Logic

```typescript
// services/consent.service.ts
async function checkOrRequestConsent(
  patientId: string, 
  granteeUserId: string, 
  context: { scope: string[], purpose: string }
): Promise<ConsentDecision> {
  
  // 1. Check for active consent
  const activeConsent = await Consent.findOne({
    patientId,
    granteeUserId,
    status: 'ACTIVE',
    expiresAt: { $gt: new Date() }
  });
  
  if (activeConsent) {
    // Verify scope matches
    if (context.scope.every(s => activeConsent.scope.includes(s))) {
      // Auto-approve, just notify patient
      await sendWhatsAppSilent(patient.phone, 
        `Dr. ${doctor.fullName} accessed your records at ${time()}.`);
      
      await AccessLog.create({
        actorUserId: granteeUserId,
        action: 'VIEW_PATIENT',
        patientId,
        consentId: activeConsent._id
      });
      
      return { decision: 'APPROVED_AUTO', consent: activeConsent };
    }
  }
  
  // 2. Check for recent consent (< 6 months) for tiered auto-approve
  const recentConsent = await Consent.findOne({
    patientId,
    granteeUserId,
    status: { $in: ['EXPIRED', 'AUTO_RENEWED'] },
    grantedAt: { $gt: subMonths(new Date(), 6) }
  }).sort({ grantedAt: -1 });
  
  if (recentConsent && context.purpose === 'CONSULTATION') {
    // Auto-renew (the tiered consent fix)
    const newConsent = await Consent.create({
      patientId, granteeUserId,
      granteeType: 'DOCTOR',
      scope: context.scope,
      grantedAt: new Date(),
      expiresAt: addHours(new Date(), 4),       // 4 hour TTL for the visit
      status: 'ACTIVE',
      grantMethod: 'AUTO_RECENT_DOCTOR',
      nonce: generateNonce()
    });
    
    // Loud notification — important so patient knows
    await sendWhatsApp(patient.phone, 
      `⚠️ Dr. ${doctor.fullName} at ${clinic.displayName} is viewing your records.\n\n` +
      `If this is unexpected, tap to revoke: ${revokeLink(newConsent._id)}`);
    
    return { decision: 'APPROVED_AUTO_RENEWED', consent: newConsent };
  }
  
  // 3. No recent consent — require explicit approval
  const pendingRequest = await ConsentRequest.create({
    patientId, granteeUserId,
    scope: context.scope, purpose: context.purpose,
    status: 'PENDING',
    expiresAt: addMinutes(new Date(), 5)        // 5 min for patient to approve
  });
  
  await sendWhatsApp(patient.phone, 
    `Dr. ${doctor.fullName} at ${clinic.displayName} is requesting access to your medical records.\n\n` +
    `Approve: ${approveLink(pendingRequest._id)}\n` +
    `Deny: ${denyLink(pendingRequest._id)}\n\n` +
    `This request expires in 5 minutes.`);
  
  return { decision: 'PENDING_PATIENT_APPROVAL', requestId: pendingRequest._id };
}
```

### Frontend flow

Doctor scans QR → backend returns `PENDING_PATIENT_APPROVAL` → doctor UI shows "Waiting for patient approval..." with a polling/WebSocket update. Patient taps approve → consent created → doctor's UI loads patient data.

---

## 2.4 The Standardized Prescription System

This is the central feature of Phase 2.

### Schema

```typescript
// models/Prescription.ts
const PrescriptionSchema = new Schema({
  // Provenance
  patientId: { type: ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: ObjectId, ref: 'Doctor', required: true, index: true },
  clinicId: { type: ObjectId, ref: 'Clinic', required: true, index: true },
  appointmentId: { type: ObjectId, ref: 'Appointment' },
  
  prescriptionNumber: { type: String, unique: true, index: true },   // human readable, e.g., MV-RX-2026-00001
  
  // Source: MedVault-issued vs externally uploaded
  source: { 
    type: String, 
    enum: ['MEDVAULT_NATIVE', 'EXTERNAL_OCR', 'EXTERNAL_MANUAL_ENTRY'],
    default: 'MEDVAULT_NATIVE',
    required: true
  },
  
  // Diagnosis
  diagnosis: [{
    icd10Code: { type: String, required: true },
    displayName: String,
    notes: String,
    isPrimary: Boolean
  }],
  
  // Medications (the core)
  medications: [{
    rxnormCui: { type: String, required: true },
    genericName: { type: String, required: true },
    brandName: String,                          // what doctor selected (Indian brand)
    strength: String,                           // "500mg"
    form: { type: String, enum: ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER'] },
    route: { type: String, enum: ['ORAL', 'IV', 'IM', 'SUBLINGUAL', 'TOPICAL', 'INHALED', 'OPHTHALMIC'] },
    
    dosage: {
      frequency: { type: String, enum: ['ONCE_DAILY', 'TWICE_DAILY', 'THRICE_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_4H', 'EVERY_6H', 'EVERY_8H', 'AS_NEEDED', 'WEEKLY', 'CUSTOM'] },
      timing: [{ type: String, enum: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'BEFORE_MEAL', 'AFTER_MEAL', 'BEDTIME'] }],
      duration: { value: Number, unit: { type: String, enum: ['DAYS', 'WEEKS', 'MONTHS'] } },
      totalQuantity: Number,                    // computed
      
      customInstructions: String                // free text for edge cases
    },
    
    notes: String,
    
    // Safety check results (populated at creation)
    safetyChecks: {
      allergyChecked: Boolean,
      allergyConflict: Boolean,
      allergyDetails: String,
      
      interactionChecked: Boolean,
      interactionConflicts: [{
        withDrugCui: String,
        severity: String,
        managementNote: String,
        overriddenByDoctor: Boolean,
        overrideReason: String
      }],
      
      duplicateTherapyChecked: Boolean,
      duplicateTherapyDetected: Boolean,
      duplicateTherapyDetails: String,
      
      doseAdjustmentChecked: Boolean,
      doseAdjustmentRecommended: Boolean,
      doseAdjustmentReason: String              // "Renal impairment - reduce by 50%"
    }
  }],
  
  // Lab orders (optional)
  labOrders: [{
    loincCode: String,
    displayName: String,
    priority: { type: String, enum: ['ROUTINE', 'URGENT', 'STAT'] },
    fastingRequired: Boolean,
    notes: String
  }],
  
  // Follow-up
  followUp: {
    type: { type: String, enum: ['NONE', 'IN_PERSON', 'TELEMEDICINE', 'AS_NEEDED'] },
    afterValue: Number,
    afterUnit: { type: String, enum: ['DAYS', 'WEEKS', 'MONTHS'] },
    notes: String
  },
  
  // Generated artifacts
  pdfUrl: String,
  qrCodeData: String,                           // signed payload for pharmacy
  qrCodeImageUrl: String,
  
  // Pharmacy fulfillment
  fulfillment: {
    status: { type: String, enum: ['PENDING', 'PARTIALLY_DISPENSED', 'FULLY_DISPENSED', 'EXPIRED'], default: 'PENDING' },
    dispensedAt: Date,
    dispensedBy: { type: ObjectId, ref: 'User' },
    pharmacyClinicId: { type: ObjectId, ref: 'Clinic' },
    pharmacyNotes: String,
    substitutions: [{
      originalRxnormCui: String,
      substitutedWithCui: String,
      reason: String
    }]
  },
  
  // Blockchain (filled in Phase 4)
  blockchain: {
    status: { type: String, enum: ['NOT_QUEUED', 'QUEUED', 'PENDING', 'ANCHORED', 'FAILED'], default: 'NOT_QUEUED' },
    contentHash: String,
    txHash: String,
    blockNumber: Number,
    anchoredAt: Date
  },
  
  // AI assistance metadata
  aiAssistance: {
    usedPreVisitDiagnosisSuggestion: Boolean,
    selectedFromAiSuggestion: Boolean,
    aiSuggestionRank: Number,                  // 1, 2, 3 if matched
    doctorOverrideRedFlag: Boolean,
    doctorOverrideReason: String
  },
  
  // Validity
  validUntil: Date,                            // typically 30 days from issue for chronic, shorter for acute
  isExpired: { type: Boolean, default: false },
  
  // Soft delete + audit
  deletedAt: Date,
  voidedAt: Date,
  voidReason: String
}, { timestamps: true });

PrescriptionSchema.index({ patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ doctorId: 1, createdAt: -1 });
PrescriptionSchema.index({ 'fulfillment.status': 1 });
PrescriptionSchema.index({ source: 1 });
```

### Prescription creation flow

```typescript
// services/prescription.service.ts
async function createPrescription(input: PrescriptionInput, doctorUser: AuthUser) {
  // 1. Authorization
  await assertActiveConsent(input.patientId, doctorUser.userId, ['FULL', 'PRESCRIPTIONS']);
  
  const patient = await Patient.findById(input.patientId);
  const doctor = await Doctor.findById(doctorUser.doctorId);
  
  // 2. Run safety checks on each medication
  for (let med of input.medications) {
    med.safetyChecks = await runMedicationSafetyChecks(med, patient);
    
    // Block on hard contraindications unless explicitly overridden
    if (med.safetyChecks.allergyConflict && !input.allergyOverrideAcknowledged) {
      throw new SafetyCheckError('ALLERGY_CONFLICT', med.safetyChecks.allergyDetails);
    }
    if (med.safetyChecks.interactionConflicts.some(c => c.severity === 'CONTRAINDICATED') 
        && !input.interactionOverrideAcknowledged) {
      throw new SafetyCheckError('CONTRAINDICATED_INTERACTION', med.safetyChecks.interactionConflicts);
    }
  }
  
  // 3. Create prescription document
  const prescriptionNumber = await generatePrescriptionNumber();
  const prescription = await Prescription.create({
    ...input,
    prescriptionNumber,
    source: 'MEDVAULT_NATIVE',
    validUntil: computeValidUntil(input.medications)
  });
  
  // 4. Generate PDF (server-side rendering from structured data)
  prescription.pdfUrl = await generatePrescriptionPDF(prescription);
  
  // 5. Generate pharmacy QR
  prescription.qrCodeData = generatePharmacyQR(prescription._id, prescription.prescriptionNumber);
  prescription.qrCodeImageUrl = await renderQRImage(prescription.qrCodeData);
  
  await prescription.save();
  
  // 6. Update patient's activeMedications
  await updatePatientActiveMedications(input.patientId, prescription);
  
  // 7. Queue for blockchain (Phase 4 — for now, just mark queued)
  await BlockchainQueue.add('anchor-prescription', { prescriptionId: prescription._id });
  
  // 8. Notify patient
  await sendWhatsApp(patient.phone, 
    `Dr. ${doctor.fullName} prescribed new medication. ` +
    `View: ${prescriptionLink(prescription._id)}`);
  
  // 9. Update appointment
  if (input.appointmentId) {
    await Appointment.updateOne({ _id: input.appointmentId }, 
      { prescriptionId: prescription._id, status: 'COMPLETED', consultationEndedAt: new Date() });
  }
  
  // 10. Audit log
  await AccessLog.create({
    actorUserId: doctorUser.userId,
    action: 'CREATE_PRESCRIPTION',
    targetType: 'Prescription',
    targetId: prescription._id,
    patientId: input.patientId
  });
  
  return prescription;
}
```

### The safety check service (THE key feature of Phase 2)

```typescript
// services/safety-checks.service.ts
async function runMedicationSafetyChecks(med: MedicationInput, patient: Patient) {
  const results = {
    allergyChecked: true,
    allergyConflict: false,
    allergyDetails: null,
    
    interactionChecked: true,
    interactionConflicts: [],
    
    duplicateTherapyChecked: true,
    duplicateTherapyDetected: false,
    duplicateTherapyDetails: null,
    
    doseAdjustmentChecked: true,
    doseAdjustmentRecommended: false,
    doseAdjustmentReason: null
  };
  
  // 1. Allergy check
  const drug = await RefDrug.findOne({ rxnormCui: med.rxnormCui });
  for (const allergy of patient.allergies) {
    // Direct match: patient allergic to "Penicillin", drug is in penicillin class
    if (drug.drugClass.toLowerCase().includes(allergy.allergen.toLowerCase()) ||
        drug.genericName.toLowerCase().includes(allergy.allergen.toLowerCase())) {
      results.allergyConflict = true;
      results.allergyDetails = `Patient allergic to ${allergy.allergen} (${allergy.severity}). Prescribed drug ${drug.genericName} is in matching class.`;
      break;
    }
  }
  
  // 2. Drug-drug interactions vs active medications
  // Active = currently active + last 6 months chronic refills
  const activeRxnormCuis = patient.activeMedications.map(m => m.rxnormCui);
  const recentRxnormCuis = await getRecentChronicMedications(patient._id, 6);
  const allActiveCuis = [...new Set([...activeRxnormCuis, ...recentRxnormCuis])];
  
  for (const otherCui of allActiveCuis) {
    if (otherCui === med.rxnormCui) continue;
    
    const interaction = await RefInteraction.findOne({
      $or: [
        { drug1Cui: med.rxnormCui, drug2Cui: otherCui },
        { drug1Cui: otherCui, drug2Cui: med.rxnormCui }
      ]
    });
    
    if (interaction) {
      results.interactionConflicts.push({
        withDrugCui: otherCui,
        severity: interaction.severity,
        managementNote: interaction.management
      });
    }
  }
  
  // 3. Duplicate therapy (same drug class)
  for (const activeMed of patient.activeMedications) {
    const activeDrug = await RefDrug.findOne({ rxnormCui: activeMed.rxnormCui });
    if (activeDrug && activeDrug.drugClass === drug.drugClass && activeMed.rxnormCui !== med.rxnormCui) {
      results.duplicateTherapyDetected = true;
      results.duplicateTherapyDetails = `Patient already on ${activeDrug.genericName} (same class: ${drug.drugClass})`;
      break;
    }
  }
  
  // 4. Dose adjustment recommendations
  const renalCondition = patient.chronicConditions.find(c => 
    ['N18.1', 'N18.2', 'N18.3', 'N18.4', 'N18.5', 'N18.6'].includes(c.icd10Code));  // CKD stages
  if (renalCondition && drug.renalDoseAdjust?.required) {
    results.doseAdjustmentRecommended = true;
    results.doseAdjustmentReason = `Patient has CKD (${renalCondition.displayName}). ${drug.renalDoseAdjust.notes}`;
  }
  
  const hepaticCondition = patient.chronicConditions.find(c => c.icd10Code.startsWith('K7'));  // liver disease
  if (hepaticCondition && drug.hepaticDoseAdjust?.required) {
    results.doseAdjustmentRecommended = true;
    results.doseAdjustmentReason = (results.doseAdjustmentReason || '') + 
      ` Hepatic dose adjustment: ${drug.hepaticDoseAdjust.notes}`;
  }
  
  return results;
}
```

### Real-time safety checks via WebSocket

As the doctor types each medication in the form, fire safety checks immediately so the warning shows before they submit.

```typescript
// routes/prescription.ts
router.post('/prescriptions/check-medication', requireRole('DOCTOR'), async (req, res) => {
  const { patientId, medication } = req.body;
  const patient = await Patient.findById(patientId);
  const result = await runMedicationSafetyChecks(medication, patient);
  res.json(result);
});
```

Frontend hits this endpoint on each medication add. Returns in <100ms because reference data is indexed.

### Updating activeMedications atomically

```typescript
async function updatePatientActiveMedications(patientId: string, prescription: Prescription) {
  for (const med of prescription.medications) {
    const expectedEnd = computeMedicationEndDate(prescription.createdAt, med.dosage);
    
    await Patient.updateOne(
      { _id: patientId },
      {
        $push: {
          activeMedications: {
            prescriptionId: prescription._id,
            rxnormCui: med.rxnormCui,
            displayName: med.brandName || med.genericName,
            genericName: med.genericName,
            drugClass: (await RefDrug.findOne({ rxnormCui: med.rxnormCui }))?.drugClass,
            startedAt: prescription.createdAt,
            expectedEndAt: expectedEnd
          }
        }
      }
    );
  }
}

// Background job: clean up expired medications nightly
async function cleanupExpiredMedications() {
  await Patient.updateMany(
    {},
    { $pull: { activeMedications: { expectedEndAt: { $lt: new Date() } } } }
  );
}
```

### PDF generation

Use `pdfkit` or `puppeteer` (renders an HTML template — easier for design control).

```typescript
// services/pdf.service.ts
async function generatePrescriptionPDF(prescription: Prescription) {
  const html = await renderPrescriptionTemplate({
    prescription,
    clinic: await Clinic.findById(prescription.clinicId),
    doctor: await Doctor.findById(prescription.doctorId),
    patient: await Patient.findById(prescription.patientId)
  });
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  
  const filename = `prescriptions/${prescription.prescriptionNumber}.pdf`;
  const url = await uploadToS3(pdfBuffer, filename, 'application/pdf');
  return url;
}
```

Design the HTML template to be consistent: header with clinic logo + verification badges, doctor info with NMC number, patient info, medications in a clean table, footer with QR code, blockchain hash (filled in Phase 4), digital signature placeholder.

### Pharmacy QR code

Signed payload, similar pattern to emergency QR but with shorter TTL:

```typescript
function generatePharmacyQR(prescriptionId: string, prescriptionNumber: string) {
  const payload = {
    type: 'PRESCRIPTION',
    pid: prescriptionId.toString(),
    pn: prescriptionNumber,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),  // 30 days
    nonce: crypto.randomBytes(8).toString('hex')
  };
  
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', process.env.QR_HMAC_SECRET!)
                     .update(payloadB64).digest('base64url');
  
  return `medvault://rx/${payloadB64}.${hmac}`;
}
```

---

## 2.5 Pharmacy Fulfillment Flow

### Routes

```typescript
POST /api/pharmacy/scan-prescription
  body: { qrData }
  returns: prescription details if valid + patient name + clinic + doctor

POST /api/pharmacy/dispense/:prescriptionId
  body: { dispensedItems: [...], substitutions: [...], notes }
  returns: success
```

### Logic

```typescript
async function scanPrescriptionQR(qrData: string) {
  const [payloadB64, signature] = qrData.replace('medvault://rx/', '').split('.');
  
  const expectedSig = crypto.createHmac('sha256', process.env.QR_HMAC_SECRET!)
                            .update(payloadB64).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new Error('Invalid prescription QR');
  }
  
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  if (payload.exp < Date.now() / 1000) throw new Error('Prescription QR expired');
  
  const prescription = await Prescription.findById(payload.pid)
    .populate('doctorId clinicId patientId');
  
  if (prescription.fulfillment.status === 'FULLY_DISPENSED') {
    throw new Error('Prescription already fully dispensed');
  }
  if (prescription.validUntil < new Date()) {
    throw new Error('Prescription expired');
  }
  
  return prescription;
}

async function dispensePrescription(prescriptionId, pharmacyClinicId, dispenseData, operatorUserId) {
  // Verify pharmacy is verified
  const pharmacy = await Clinic.findById(pharmacyClinicId);
  if (pharmacy.type !== 'PHARMACY' && pharmacy.type !== 'MULTI_SPECIALTY') {
    throw new Error('Not a pharmacy');
  }
  if (pharmacy.trustLevel !== 'TIER_1_FULL') {
    throw new Error('Pharmacy not fully verified');
  }
  
  await Prescription.updateOne(
    { _id: prescriptionId },
    {
      'fulfillment.status': dispenseData.partial ? 'PARTIALLY_DISPENSED' : 'FULLY_DISPENSED',
      'fulfillment.dispensedAt': new Date(),
      'fulfillment.dispensedBy': operatorUserId,
      'fulfillment.pharmacyClinicId': pharmacyClinicId,
      'fulfillment.pharmacyNotes': dispenseData.notes,
      'fulfillment.substitutions': dispenseData.substitutions || []
    }
  );
  
  // Notify patient
  // ...
  
  // Queue for blockchain (Phase 4)
  await BlockchainQueue.add('anchor-fulfillment', { prescriptionId });
  
  // Audit log
  await AccessLog.create({ /* ... */ });
}
```

---

## 2.6 Lab Report System

### Schema

```typescript
// models/LabReport.ts
const LabReportSchema = new Schema({
  patientId: { type: ObjectId, ref: 'Patient', required: true, index: true },
  labClinicId: { type: ObjectId, ref: 'Clinic', required: true, index: true },
  orderedByDoctorId: { type: ObjectId, ref: 'Doctor' },
  prescriptionId: { type: ObjectId, ref: 'Prescription' },  // if ordered from a prescription
  
  reportNumber: { type: String, unique: true },
  
  source: { type: String, enum: ['MEDVAULT_NATIVE', 'EXTERNAL_OCR', 'EXTERNAL_MANUAL'] },
  
  collectionDate: Date,
  reportDate: { type: Date, required: true },
  
  // Structured test results
  results: [{
    loincCode: String,
    testName: { type: String, required: true },
    value: Schema.Types.Mixed,                  // can be number, string, or qualitative
    unit: String,
    referenceRange: { low: Number, high: Number, textual: String },
    flag: { type: String, enum: ['NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH', 'ABNORMAL'] },
    notes: String
  }],
  
  // Overall
  hasAbnormalValues: { type: Boolean, default: false },
  hasCriticalValues: { type: Boolean, default: false },
  
  // Source files
  attachmentUrls: [String],                    // PDF original
  
  // Provenance for external uploads
  externalUpload: {
    uploadedByPatient: Boolean,
    uploadedAt: Date,
    ocrConfidence: Number,
    verifiedByLab: Boolean
  },
  
  blockchain: { /* same shape as prescription */ }
}, { timestamps: true });

LabReportSchema.index({ patientId: 1, reportDate: -1 });
```

### Upload flow (structured-first)

Two paths into the same schema:

**Path A — Lab operator uploads structured:**

```typescript
POST /api/lab/upload
  body: { patientMedvaultId, collectionDate, reportDate, results: [...] }
```

Lab operator fills out form, results are typed in. Optional: attach PDF as supporting doc. Saved directly.

**Path B — Patient uploads photo of old lab report:**

```typescript
POST /api/patient/upload-external-lab
  body: multipart/form-data { image }
```

Image goes to OCR pipeline (Phase 4). For now in Phase 2: save raw image, mark as `EXTERNAL_OCR` with `verifiedByLab: false`. The OCR processing happens in Phase 4.

### Abnormality detection

```typescript
function detectAbnormalities(results: LabResult[]) {
  for (const r of results) {
    if (typeof r.value === 'number' && r.referenceRange.low !== null) {
      if (r.value < r.referenceRange.low * 0.5) r.flag = 'CRITICAL_LOW';
      else if (r.value < r.referenceRange.low) r.flag = 'LOW';
      else if (r.value > r.referenceRange.high * 1.5) r.flag = 'CRITICAL_HIGH';
      else if (r.value > r.referenceRange.high) r.flag = 'HIGH';
      else r.flag = 'NORMAL';
    }
  }
  return results;
}
```

Notify patient AND ordering doctor on critical values immediately.

---

## 2.7 Patient Timeline API

The doctor's dashboard (Phase 5 UI) needs a unified timeline.

```typescript
// routes/patient.ts
router.get('/api/patient/:patientId/timeline', 
  requireRole('DOCTOR', 'PATIENT'), 
  requireActiveConsent,
  async (req, res) => {
    const { from, to, types } = req.query;
    
    const [prescriptions, labs, appointments] = await Promise.all([
      Prescription.find({ patientId, createdAt: { $gte: from, $lte: to } }).lean(),
      LabReport.find({ patientId, reportDate: { $gte: from, $lte: to } }).lean(),
      Appointment.find({ patientId, slotStart: { $gte: from, $lte: to } }).lean()
    ]);
    
    const events = [
      ...prescriptions.map(p => ({ type: 'PRESCRIPTION', date: p.createdAt, data: p })),
      ...labs.map(l => ({ type: 'LAB_REPORT', date: l.reportDate, data: l })),
      ...appointments.map(a => ({ type: 'APPOINTMENT', date: a.slotStart, data: a }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    res.json(events);
});
```

---

## 2.8 Patient Summary Endpoint (for Doctor Dashboard)

```typescript
// services/patient-summary.service.ts
async function buildPatientSummary(patientId: string, viewerDoctorId: string) {
  // Cache check
  const cacheKey = `summary:${patientId}:${viewerDoctorId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const patient = await Patient.findById(patientId);
  
  const [prescriptions, labs, appointments] = await Promise.all([
    Prescription.find({ patientId }).sort({ createdAt: -1 }).limit(50),
    LabReport.find({ patientId }).sort({ reportDate: -1 }).limit(50),
    Appointment.find({ patientId, status: 'COMPLETED' }).sort({ slotStart: -1 }).limit(50)
  ]);
  
  const summary = {
    patient: {
      name: patient.fullName,
      age: computeAge(patient.dateOfBirth),
      sex: patient.sex,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      activeMedications: patient.activeMedications
    },
    
    stats: {
      totalVisits: appointments.length,
      visitsLast12Months: aggregateVisitsByMonth(appointments, 12),
      topDiagnoses: aggregateDiagnoses(prescriptions),
      medicationTimeline: buildMedicationTimeline(prescriptions),
      adherence: computeAdherence(prescriptions)
    },
    
    labTrends: extractLabTrends(labs),                  // sparkline data
    
    recentPrescriptions: prescriptions.slice(0, 5),
    
    // Phase 3 fills these
    aiSummaryParagraph: null,
    symptomRecurrence: null
  };
  
  await redis.setex(cacheKey, 300, JSON.stringify(summary));  // 5 min cache
  return summary;
}
```

Computation helpers (`aggregateVisitsByMonth`, `buildMedicationTimeline`, `computeAdherence`) are straightforward iterations over the prescription/appointment arrays. Implement them with clear logic, not clever code.

### Adherence calculation

```typescript
function computeAdherence(prescriptions: Prescription[]) {
  const chronicRefills = prescriptions.filter(p => 
    p.medications.some(m => isChronicMedication(m))
  );
  
  if (chronicRefills.length < 2) return { score: 'INSUFFICIENT_DATA', gaps: 0 };
  
  let gaps = 0;
  const grouped = groupByMedication(chronicRefills);
  
  for (const [drugCui, refills] of grouped) {
    refills.sort((a, b) => a.createdAt - b.createdAt);
    for (let i = 1; i < refills.length; i++) {
      const expectedNext = addDays(refills[i-1].createdAt, durationDays(refills[i-1]));
      const actual = refills[i].createdAt;
      const gapDays = differenceInDays(actual, expectedNext);
      if (gapDays > 7) gaps++;
    }
  }
  
  const score = gaps === 0 ? 'GOOD' : gaps <= 2 ? 'MODERATE' : 'POOR';
  return { score, gaps };
}
```

---

## 2.9 Checklist — Definition of Done for Phase 2

- [ ] Reference data seeded (RxNorm, ICD-10, LOINC, India drugs, interactions)
- [ ] Drug autocomplete works with fuzzy matching across Indian brands
- [ ] Doctor can register availability, patient can book slot
- [ ] Tiered consent works: first visit asks, return visit auto-approves
- [ ] Prescription form takes structured input
- [ ] All 4 safety checks fire in real-time as doctor types medications
- [ ] Allergy conflict blocks submission unless overridden
- [ ] Contraindicated interaction blocks submission unless overridden
- [ ] Prescription PDF generates with consistent formatting
- [ ] Pharmacy QR validates and prescription can be dispensed
- [ ] activeMedications field updates on prescription create, cleanup job removes expired
- [ ] Lab operator can upload structured lab results
- [ ] Abnormal lab values are flagged and patient is notified
- [ ] Patient timeline aggregates prescriptions, labs, appointments
- [ ] Patient summary endpoint returns stats, trends, adherence
- [ ] All actions logged in AccessLog
- [ ] At least 30 unit/integration tests covering safety checks

When you can demo: doctor logs in → opens patient → types "Aspirin" → autocomplete shows it → tries to add to patient who's allergic → blocked with explanation → overrides → adds another drug with severe interaction → warning shown → completes prescription → patient gets WhatsApp → pharmacy scans QR → dispenses — Phase 2 is done.

---

## Parallel Work to Continue

- Phase 3 prep: i2b2 DUA should be approved by now — start downloading DDXPlus, exploring data
- Phase 3 prep: Whisper recording sessions with friends — record at least 50 clips
- Phase 4 prep: Continue collecting handwritten prescription samples (target 100+)
- Phase 5 prep: Start sketching UI designs in Figma (don't code yet)
