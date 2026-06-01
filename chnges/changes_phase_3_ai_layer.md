# Phase 3 — AI Layer: Changes Required

**Severity:** Minimal — almost nothing changes
**Effort estimate:** 2-3 days of integration touch-ups
**Touches:** Endpoint input shape (visit vs appointment), nothing else

---

## TL;DR

Phase 3 is the safest of all phases. The AI service doesn't care about clinic admins, pharmacies, appointments, or emergency QRs — it processes symptoms, transcribes audio, generates summaries, runs OCR on prescriptions.

**Keep all of:**
- Whisper LoRA pipeline
- Bio_ClinicalBERT NER + scispacy UMLS linking
- DDXPlus classifier + India reweighting + isotonic calibration
- Red flag detector
- LLM patient summary
- Symptom recurrence (FAISS)
- All 5 AI endpoints

The only changes are mechanical: a few backend integration points that referenced `appointmentId` now use `visitId`.

---

## Files To Modify

```
apps/backend/src/services/ai-client.service.ts      # Mechanical: field name changes
apps/backend/src/services/visit.service.ts          # (new) — call AI for pre-visit symptom processing
apps/backend/src/services/patient-summary.service.ts # Update LLM input payload
```

## Files To NOT Touch

```
apps/ai-service/                                    # ALL OF IT stays the same
apps/backend/src/services/ner.service.ts            # if any backend wrapper exists, unchanged
```

---

## 1. Mechanical Rename: appointmentId → visitId

In Phase 2 we replaced `Appointment` with `Visit`. The AI pipeline integration points use `appointmentId` in the field name. Just rename.

### Before

```typescript
// services/visit.service.ts (was appointment.service.ts)
async function processPreVisitSymptoms(appointmentId: string, audioOrText: AudioOrText) {
  // ... 
  await Appointment.updateOne(
    { _id: appointmentId },
    {
      'preVisitSymptoms.rawText': text,
      'preVisitSymptoms.extractedEntities': ner.entities,
      // ...
    }
  );
}
```

### After

```typescript
// services/visit.service.ts
async function processPreVisitSymptoms(visitId: string, audioOrText: AudioOrText) {
  // ...
  await Visit.updateOne(
    { _id: visitId },
    {
      'preVisitSymptoms.rawText': text,
      'preVisitSymptoms.extractedEntities': ner.entities,
      'preVisitSymptoms.aiTop3Diagnoses': diagnosis.top_diagnoses,
      'preVisitSymptoms.redFlags': diagnosis.red_flags,
      'preVisitSymptoms.recordedAt': new Date()
    }
  );
}
```

The AI service endpoints (`/api/ai/transcribe`, `/api/ai/ner`, `/api/ai/diagnose`) don't take a `visitId` or `appointmentId` — they just take audio/text. So the AI service itself doesn't change at all.

---

## 2. Pre-Visit Recording Flow — Decoupled From Visits

In old model, pre-visit symptoms were tied to a booked appointment. In new model, no booking exists.

### New flow

Patient opens MedVault any time before going to clinic, taps "Record symptoms":

```typescript
// New endpoint
POST /api/patient/me/pre-visit-symptoms
body: { 
  audioFile OR text,
  intendedDoctorId?,    // optional — patient can indicate who they're going to
  expectedVisitDate?    // optional
}

Behavior:
- AI service runs Whisper → NER → classifier
- Result stored in patient's PreVisitSymptoms collection (NEW, see below)
- When doctor creates a Visit for this patient, system auto-attaches the most recent pre-visit symptom recording (within last 48 hours)
```

### New schema: PreVisitSymptoms (light)

```typescript
// models/PreVisitSymptoms.ts — NEW
const PreVisitSymptomsSchema = new Schema({
  patientId: { type: ObjectId, ref: 'Patient', required: true, index: true },
  visitId: { type: ObjectId, ref: 'Visit', sparse: true },   // populated when visit created
  
  rawText: String,
  audioUrl: String,
  
  // Phase 3 AI outputs
  extractedEntities: [Schema.Types.Mixed],
  aiTop3Diagnoses: [Schema.Types.Mixed],
  redFlags: [String],
  
  recordedAt: { type: Date, default: Date.now, index: true },
  attachedToVisit: { type: Boolean, default: false },
  
  intendedDoctorId: { type: ObjectId, ref: 'Doctor' }
}, { timestamps: true });
```

Or — simpler alternative — just keep it as a subdoc on Visit, and patient's "record symptoms" creates a stub Visit in `CHECKED_IN` status that the doctor later picks up. **Recommended:** stub Visit approach. Cleaner.

```typescript
// Simpler approach
async function recordPreVisitSymptoms(patientId: string, audioOrText: AudioOrText, intendedDoctorId?: string) {
  // Create a placeholder visit
  const visit = await Visit.create({
    patientId,
    doctorId: intendedDoctorId,                  // null if patient doesn't know yet
    startedAt: new Date(),
    status: 'CHECKED_IN',
    type: 'WALK_IN',
    preVisitSymptoms: {
      audioUrl: await uploadAudioToR2(audioOrText.audio),
      recordedAt: new Date()
    }
  });
  
  // Run AI pipeline (same as before, just on Visit instead of Appointment)
  const text = audioOrText.text || (await aiClient.transcribe(audioOrText.audio)).text;
  const ner = await aiClient.extractEntities(text);
  
  const patient = await Patient.findById(patientId);
  const diagnosis = await aiClient.diagnose(
    ner.entities,
    computeAge(patient.dateOfBirth),
    patient.sex
  );
  
  await Visit.updateOne(
    { _id: visit._id },
    {
      'preVisitSymptoms.rawText': text,
      'preVisitSymptoms.extractedEntities': ner.entities,
      'preVisitSymptoms.aiTop3Diagnoses': diagnosis.top_diagnoses,
      'preVisitSymptoms.redFlags': diagnosis.red_flags
    }
  );
  
  return visit;
}
```

When doctor's staff creates a "real" Visit later (patient walks in), system looks for any existing `CHECKED_IN` Visit for this patient within the last 24 hours and reuses it.

---

## 3. Patient Summary Input — Adjust for New Schema

The LLM patient summary endpoint receives patient data and generates a paragraph. The input shape changes slightly because we removed some fields.

### Old input

```python
user_prompt = f"""
Patient: {patient_data['age']}-year-old {patient_data['sex']}
Allergies: ...
Chronic conditions: ...
Active medications: ...
Recent lab trends: ...
Adherence score: ...
Visits: {total_visits} total, last visit {last_visit}    # OLD: from appointments
Current presenting concern: {current_symptoms}
"""
```

### New input

```python
user_prompt = f"""
Patient: {patient_data['age']}-year-old {patient_data['sex']}
Allergies: ...
Chronic conditions: ...
Active medications: ...
Recent lab trends: ...
Adherence score: ...
Visits: {total_visits} total, last visit {last_visit}    # NEW: from visits collection
Visits with current doctor: {visits_with_doctor}          # NEW — useful context
Current presenting concern: {current_symptoms}
"""
```

This is just changing where the data comes from in the backend (Visit collection instead of Appointment). The LLM prompt is essentially identical — same fields, same instructions, same output.

---

## 4. Symptom Recurrence — Works As Is

The FAISS index per patient queries past visit symptom embeddings. Old code:

```python
past_visits = await db.appointments.find({
    "patientId": self.patient_id,
    "status": "COMPLETED",
    "preVisitSymptoms.embedding": {"$exists": True}
}).to_list(None)
```

### Change to

```python
past_visits = await db.visits.find({                       # appointments → visits
    "patientId": self.patient_id,
    "status": "COMPLETED",
    "preVisitSymptoms.embedding": {"$exists": True}
}).to_list(None)
```

That's the whole change. One collection name.

---

## 5. AI Evaluation — Minor Update

The evaluation suite is mostly unchanged, but you can ENHANCE it with one new metric since labs are now part of the flow:

### New evaluation: "AI suggestion → lab order alignment"

When AI suggests a diagnosis, did the doctor order tests appropriate for that diagnosis? This is an interesting paper metric.

```python
# evaluation/lab_alignment_eval.py — NEW (optional)
def evaluate_ai_to_lab_alignment():
    """For each visit where AI suggested diagnoses, check if ordered tests align with those diagnoses."""
    visits = db.visits.find({
        "preVisitSymptoms.aiTop3Diagnoses": {"$exists": True, "$ne": []},
        "labOrderIds": {"$exists": True, "$ne": []}
    })
    
    aligned = 0
    total = 0
    for visit in visits:
        ai_dx = visit['preVisitSymptoms']['aiTop3Diagnoses'][0]['condition']
        appropriate_tests = get_standard_workup_for(ai_dx)        # need a lookup table
        
        ordered = []
        for order_id in visit['labOrderIds']:
            order = db.laborders.find_one({"_id": order_id})
            ordered.extend([t['loincCode'] for t in order['tests']])
        
        if any(t in ordered for t in appropriate_tests):
            aligned += 1
        total += 1
    
    return {"alignment_rate": aligned / total, "total_visits": total}
```

This is a v2 enhancement, not required for v1.

---

## 6. Updated Definition of Done — Phase 3 v2

- [ ] AI service runs unchanged from Phase 3 v1
- [ ] All field renames done (`appointmentId` → `visitId`)
- [ ] Pre-visit symptom flow works: patient records symptoms → stub Visit created → doctor picks up Visit on walk-in
- [ ] Patient summary endpoint pulls from `Visit` not `Appointment`
- [ ] FAISS recurrence pulls from `visits` collection not `appointments`
- [ ] All 4 AI contributions still measurable on test sets
- [ ] (Optional) AI-to-lab-order alignment evaluation script

When you can demo: from your phone, record "mujhe pet mein dard 3 din se, fever bhi hai" → AI processes → see suggested diagnoses → walk into clinic 30 min later → doctor's staff types your phone → MedVault auto-attaches your pre-visit recording → doctor sees AI suggestions immediately — Phase 3 v2 is done.

---

## What You Definitely Don't Need To Re-Train

- Whisper LoRA model — unchanged
- BioClinicalBERT NER — unchanged
- DDXPlus classifier — unchanged
- TrOCR fine-tuned model — unchanged
- YOLO region detector — unchanged

All the model weights you've trained are 100% reusable. The integration touches are pure backend plumbing.
