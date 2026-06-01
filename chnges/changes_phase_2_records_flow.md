# Phase 2 — Records Flow: Changes Required

**Severity:** Heavy rework (biggest of all phases)
**Effort estimate:** 3-4 weeks
**Touches:** Appointment system (delete), Pharmacy flow (delete), Lab system (rebuild as marketplace), Prescription (small tweaks), Visit (new), LabOrder (new)

---

## TL;DR

Phase 2 had three big subsystems: appointments, prescriptions, and labs (+pharmacy fulfillment). Two of those (appointments, pharmacy) go away. Labs becomes a marketplace. Prescriptions mostly survive intact.

What gets built in their place:
- `Visit` entity replaces `Appointment` — no booking, just walk-in records
- `LabOrder` entity — the referral artifact
- `LabService` — lab discovery (by city + open now + favorites)
- Lab portal logic for operators to receive and fulfill orders

---

## Files To Delete

```
apps/backend/src/models/Appointment.ts
apps/backend/src/models/DoctorAvailability.ts
apps/backend/src/services/appointment.service.ts
apps/backend/src/routes/appointment.routes.ts
apps/backend/src/controllers/appointment.controller.ts

# Pharmacy
apps/backend/src/services/pharmacy.service.ts  
apps/backend/src/routes/pharmacy.routes.ts
apps/backend/src/controllers/pharmacy.controller.ts
```

## Files To Heavily Modify

```
apps/backend/src/models/Prescription.ts           # Drop fulfillment + pharmacyQR; minor cleanups
apps/backend/src/models/LabReport.ts              # Now lab-fulfilled OR external upload
apps/backend/src/services/prescription.service.ts # Drop pharmacy QR generation
apps/backend/src/services/safety-check.service.ts # Untouched — works as is
apps/backend/src/services/consent.service.ts      # Untouched
```

## Files To Add

```
apps/backend/src/models/Visit.ts                  # NEW — replaces Appointment
apps/backend/src/models/LabOrder.ts               # NEW
apps/backend/src/services/visit.service.ts        # NEW
apps/backend/src/services/lab-order.service.ts    # NEW
apps/backend/src/services/lab-discovery.service.ts # NEW — search/filter labs
apps/backend/src/services/lab-report-delivery.service.ts # NEW — handles report flow back to doctor
apps/backend/src/routes/visit.routes.ts           # NEW
apps/backend/src/routes/lab-order.routes.ts       # NEW
apps/backend/src/routes/lab.routes.ts             # NEW (lab operator side)
```

---

## 1. Drop Appointment, Add Visit

### Why

Indian clinics don't use online slot booking. The `Appointment` model with slot management, availability calendars, and booking flow is solving a problem that doesn't exist for our users.

### New: Visit entity

```typescript
// models/Visit.ts
const VisitSchema = new Schema({
  patientId: { type: ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: ObjectId, ref: 'Doctor', required: true, index: true },
  
  // No slot — created on walk-in
  startedAt: { type: Date, required: true, default: Date.now, index: true },
  endedAt: Date,
  
  status: { 
    type: String, 
    enum: ['CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'],
    default: 'CHECKED_IN',
    index: true
  },
  
  type: { type: String, enum: ['NEW_PATIENT', 'FOLLOW_UP', 'WALK_IN'], default: 'WALK_IN' },
  
  chiefComplaint: String,
  
  // Patient-recorded symptoms (Phase 3 AI fills this in)
  preVisitSymptoms: {
    rawText: String,
    audioUrl: String,
    extractedEntities: [Schema.Types.Mixed],
    aiTop3Diagnoses: [Schema.Types.Mixed],
    redFlags: [String],
    recordedAt: Date
  },
  
  // Outputs of the visit
  doctorNotes: String,                                // encrypted
  prescriptionId: { type: ObjectId, ref: 'Prescription' },
  labOrderIds: [{ type: ObjectId, ref: 'LabOrder' }],
  
  // Financial (optional, doctor-side bookkeeping)
  consultationFee: Number,
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'WAIVED'] },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'CARD'] },
  
  // Audit
  createdBy: { type: ObjectId, ref: 'User' },        // doctor or their assistant
  cancelledAt: Date,
  cancelReason: String
}, { timestamps: true });

VisitSchema.index({ doctorId: 1, startedAt: -1 });
VisitSchema.index({ patientId: 1, startedAt: -1 });
```

### Visit lifecycle

```
Patient walks in
    ↓
Doctor (or staff) creates a Visit:
    POST /api/visits
    body: { patientMedvaultId }
    
    → triggers consent check (see Phase 2.3 — unchanged)
    → if consent approved, returns Visit with status=CHECKED_IN
    ↓
Doctor opens visit, marks IN_CONSULTATION
    PATCH /api/visits/:id { status: 'IN_CONSULTATION' }
    ↓
Doctor writes prescription / orders tests during visit
    POST /api/prescriptions { visitId, ... }
    POST /api/lab-orders { visitId, ... }
    ↓
Doctor closes visit
    PATCH /api/visits/:id { status: 'COMPLETED', doctorNotes, consultationFee, paymentMethod }
```

### Replacing appointment.service references

In `prescription.service.ts`, `safety-check.service.ts`, anywhere that references `appointmentId`:
- Replace `appointmentId` with `visitId`
- Replace `Appointment.findById` with `Visit.findById`

This is a global find-replace, mostly mechanical. Field name change.

### Patient-side check-in (alternative entry point)

Patient can also self-check-in if doctor's practice has a kiosk or signage with QR code:

```typescript
// Doctor's clinic has a QR code on the door: medvault.app/checkin/dr-sharma-clinic-id
// Patient scans, sees: "You're at Dr. Sharma's clinic. Check in?"
// Patient taps → Visit created with status=CHECKED_IN
// Doctor sees patient in their queue
```

But this is optional. Default flow is doctor/staff creates the visit when patient walks in.

---

## 2. Drop Pharmacy Entirely

### Why

Indian medical stores don't adopt platforms. Patient gets PDF, takes to any store. End of MedVault's role.

### What to delete

In `Prescription.ts`:

```typescript
// REMOVE these fields entirely:
qrCodeData: String,
qrCodeImageUrl: String,
fulfillment: { /* whole subdoc */ }
```

Replace with a single optional field:

```typescript
// Add for v2 — anyone (patient, doctor, future-pharmacy) can verify prescription is genuine
verificationQR: String,         // signed payload — points to /verify/<prescriptionId>
```

### What the verification QR does

When pharmacy (or anyone) scans, they see:
- Prescription is genuine ✓
- Issued by Dr. X (NMC verified ✓)
- Issued on date Y
- Patient name + age (no other PHI)
- Medication list as printed
- Blockchain anchored ✓ (with Etherscan link)

This is **optional usage** by the pharmacy. No login required. No portal. No fulfillment tracking. Just a public verification endpoint.

```typescript
// routes/verify.routes.ts (public, no auth)
router.get('/verify/prescription/:id', async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('doctorId patientId');
  
  if (!prescription) return res.status(404).json({ valid: false, reason: 'Not found' });
  
  // Verify hash on chain
  const onChainStatus = await verifyBlockchain(prescription);
  
  // Return ONLY what's needed for verification (no PHI beyond what's already on the printed Rx)
  res.json({
    valid: true,
    prescriptionNumber: prescription.prescriptionNumber,
    issuedAt: prescription.createdAt,
    doctor: {
      name: prescription.doctorId.fullName,
      nmcRegNumber: prescription.doctorId.nmcRegNumber,
      verified: prescription.doctorId.verification.nmcVerified
    },
    patientNameAndAge: `${prescription.patientId.fullName}, ${computeAge(prescription.patientId.dateOfBirth)}`,
    medications: prescription.medications.map(m => ({
      drug: m.brandName || m.genericName,
      strength: m.strength,
      dosage: formatDosage(m.dosage)
    })),
    blockchain: {
      anchored: onChainStatus.anchored,
      txHash: onChainStatus.txHash,
      tampered: onChainStatus.tampered
    }
  });
});
```

QR on prescription PDF encodes URL: `https://medvault.app/verify/prescription/<prescriptionId>`. Anyone with a smartphone can scan and see verification.

---

## 3. Lab Marketplace — The Big New Build

### LabOrder entity

```typescript
// models/LabOrder.ts
const LabOrderSchema = new Schema({
  // Provenance
  patientId: { type: ObjectId, ref: 'Patient', required: true, index: true },
  doctorId: { type: ObjectId, ref: 'Doctor', required: true, index: true },
  visitId: { type: ObjectId, ref: 'Visit', required: true },
  prescriptionId: { type: ObjectId, ref: 'Prescription' },  // null if labs ordered without Rx
  
  labId: { type: ObjectId, ref: 'Lab', required: true, index: true },
  
  orderNumber: { type: String, unique: true, index: true },   // MV-LO-2026-00001
  
  // Tests
  tests: [{
    loincCode: { type: String, required: true },
    displayName: { type: String, required: true },
    sampleType: String,
    fastingRequired: Boolean,
    notes: String,
    estimatedPrice: Number          // from lab catalog at order time
  }],
  
  totalEstimatedPrice: Number,
  
  // Patient preferences
  homeCollectionRequested: { type: Boolean, default: false },
  homeCollectionAddress: String,
  preferredCollectionTime: Date,
  
  // Lifecycle
  status: { 
    type: String, 
    enum: [
      'CREATED',                  // doctor just issued
      'PATIENT_NOTIFIED',         // WhatsApp sent
      'ACKNOWLEDGED_BY_LAB',      // lab opened it in their portal
      'PATIENT_VISITED',          // lab marked patient as walked in
      'SAMPLE_COLLECTED',
      'IN_PROCESSING',
      'REPORT_UPLOADED',
      'DELIVERED_TO_DOCTOR',
      'CANCELLED_BY_PATIENT',     // patient went to different lab
      'CANCELLED_BY_LAB',         // lab can't fulfill
      'EXPIRED'                   // no action in 30 days
    ],
    default: 'CREATED',
    index: true
  },
  
  // Status timestamps (one per state — easier than separate logs)
  statusHistory: [{
    status: String,
    timestamp: Date,
    actor: { type: ObjectId, ref: 'User' },
    note: String
  }],
  
  // Linked output
  labReportId: { type: ObjectId, ref: 'LabReport' },
  
  // For non-partner lab fallback
  patientWentToAlternateLab: { type: Boolean, default: false },
  alternateLabName: String,                                       // free text
  
  // Commercial (deferred — fields ready)
  commercial: {
    commissionApplicable: { type: Boolean, default: false },
    commissionAmount: Number,
    invoicedAt: Date,
    paidOutAt: Date
  },
  
  expiresAt: { type: Date, index: true }    // 30 days from creation
}, { timestamps: true });

LabOrderSchema.index({ patientId: 1, status: 1 });
LabOrderSchema.index({ labId: 1, status: 1, createdAt: -1 });
LabOrderSchema.index({ doctorId: 1, createdAt: -1 });
```

### LabReport update

The existing `LabReport` schema mostly works. Add:

```typescript
// models/LabReport.ts — additions
labOrderId: { type: ObjectId, ref: 'LabOrder' },     // NEW — links back to order
uploadedByOperatorUserId: { type: ObjectId, ref: 'User' },  // NEW — which lab operator

source: { 
  type: String, 
  enum: ['MEDVAULT_NATIVE_LAB_PARTNER', 'MEDVAULT_NATIVE_DOCTOR_ENTRY', 'EXTERNAL_OCR', 'EXTERNAL_MANUAL'],
  // EXISTING: rename MEDVAULT_NATIVE → MEDVAULT_NATIVE_LAB_PARTNER for clarity
}
```

### Lab discovery service

This is what powers the "doctor picks a lab" UI.

```typescript
// services/lab-discovery.service.ts
interface LabDiscoveryParams {
  city: string;
  loincCodes?: string[];                  // filter labs that offer these tests
  doctorId?: string;                      // pull doctor's favorites
  openNow?: boolean;
  geoNear?: { lat: number; lng: number; maxKm: number };
}

async function discoverLabs(params: LabDiscoveryParams): Promise<LabSearchResult[]> {
  const query: any = {
    isActive: true,
    trustLevel: 'VERIFIED',
    'address.city': new RegExp(`^${params.city}$`, 'i')
  };
  
  // Test catalog filter
  if (params.loincCodes?.length) {
    query['testsOffered.loincCode'] = { $all: params.loincCodes };
  }
  
  // Geo filter
  if (params.geoNear) {
    query['address.geoLocation'] = {
      $near: {
        $geometry: { type: 'Point', coordinates: [params.geoNear.lng, params.geoNear.lat] },
        $maxDistance: params.geoNear.maxKm * 1000
      }
    };
  }
  
  let labs = await Lab.find(query).lean();
  
  // Filter by "open now"
  if (params.openNow) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    labs = labs.filter(lab => {
      const todayHours = lab.operatingHours.find(h => h.dayOfWeek === dayOfWeek);
      if (!todayHours || todayHours.isClosed) return false;
      return currentHHMM >= todayHours.open && currentHHMM <= todayHours.close;
    });
  }
  
  // Get doctor favorites
  let favorites: string[] = [];
  if (params.doctorId) {
    const doctor = await Doctor.findById(params.doctorId).select('preferredLabIds');
    favorites = doctor.preferredLabIds.map(id => id.toString());
  }
  
  // Compute per-lab data for the picker UI
  const results = labs.map(lab => {
    const matchingTests = params.loincCodes 
      ? lab.testsOffered.filter(t => params.loincCodes!.includes(t.loincCode))
      : [];
    
    const totalPrice = matchingTests.reduce((s, t) => s + (t.price || 0), 0);
    const maxTat = Math.max(0, ...matchingTests.map(t => t.tatHours || 0));
    
    return {
      labId: lab._id,
      displayName: lab.displayName,
      address: lab.address,
      phone: lab.phone,
      logoUrl: lab.logoUrl,
      
      isFavoriteOfDoctor: favorites.includes(lab._id.toString()),
      
      currentStatus: getCurrentOpenStatus(lab),    // { isOpen, closesAt, opensAt }
      
      pricing: {
        totalEstimatedPrice: totalPrice,
        perTest: matchingTests.map(t => ({ loinc: t.loincCode, name: t.displayName, price: t.price }))
      },
      
      turnaroundTime: { maxHours: maxTat },
      
      homeCollection: {
        available: lab.homeCollectionAvailable,
        charge: lab.homeCollectionCharge
      },
      
      distance: params.geoNear ? haversine(params.geoNear, lab.address.geoLocation.coordinates) : null,
      
      trustSignals: {
        nablAccredited: !!lab.nablAccreditationNumber && lab.verification.nablVerified,
        verifiedByPlatform: lab.trustLevel === 'VERIFIED',
        onTimeRate: lab.stats?.onTimeRate
      },
      
      stats: {
        avgTurnaroundHours: lab.stats?.avgTurnaroundHours,
        totalOrdersDelivered: lab.stats?.totalReportsUploaded
      }
    };
  });
  
  // Sort: favorites first, then by distance/price
  results.sort((a, b) => {
    if (a.isFavoriteOfDoctor && !b.isFavoriteOfDoctor) return -1;
    if (!a.isFavoriteOfDoctor && b.isFavoriteOfDoctor) return 1;
    if (a.distance != null && b.distance != null) return a.distance - b.distance;
    return a.pricing.totalEstimatedPrice - b.pricing.totalEstimatedPrice;
  });
  
  return results;
}
```

### Lab order creation flow

```typescript
// services/lab-order.service.ts
async function createLabOrder(input: LabOrderInput, doctorUser: AuthUser) {
  await assertActiveConsent(input.patientId, doctorUser.userId, ['FULL', 'LAB_REPORTS']);
  
  const patient = await Patient.findById(input.patientId);
  const doctor = await Doctor.findById(doctorUser.doctorId);
  const lab = await Lab.findById(input.labId);
  
  if (lab.trustLevel !== 'VERIFIED') {
    throw new Error('Selected lab is not verified');
  }
  
  // Hydrate test pricing from lab catalog
  const tests = input.tests.map(t => {
    const labTest = lab.testsOffered.find(lt => lt.loincCode === t.loincCode);
    return {
      loincCode: t.loincCode,
      displayName: labTest?.displayName || t.displayName,
      sampleType: labTest?.sampleType,
      fastingRequired: labTest?.fastingRequired,
      notes: t.notes,
      estimatedPrice: labTest?.price
    };
  });
  
  const totalPrice = tests.reduce((s, t) => s + (t.estimatedPrice || 0), 0);
  
  const orderNumber = await generateOrderNumber();
  const order = await LabOrder.create({
    patientId: input.patientId,
    doctorId: doctor._id,
    visitId: input.visitId,
    prescriptionId: input.prescriptionId,
    labId: lab._id,
    orderNumber,
    tests,
    totalEstimatedPrice: totalPrice,
    homeCollectionRequested: input.homeCollectionRequested,
    homeCollectionAddress: input.homeCollectionAddress,
    status: 'CREATED',
    statusHistory: [{ status: 'CREATED', timestamp: new Date(), actor: doctorUser.userId }],
    expiresAt: addDays(new Date(), 30)
  });
  
  // Notify patient
  await sendWhatsApp(patient.userId.phoneNumber,
    `Dr. ${doctor.fullName} has ordered tests at ${lab.displayName}.\n\n` +
    `Tests: ${tests.map(t => t.displayName).join(', ')}\n` +
    `Address: ${formatAddress(lab.address)}\n` +
    `Phone: ${lab.phone}\n` +
    `Expected cost: ₹${totalPrice}\n\n` +
    `View order: https://medvault.app/orders/${order._id}\n\n` +
    `Note: You can also go to any other lab. Just bring the report back to upload here.`
  );
  
  // Notify lab
  await sendWhatsApp(lab.phone,                                  // or to operator's phone
    `New lab order from Dr. ${doctor.fullName} (${doctor.practice.displayName}).\n` +
    `Patient: ${patient.fullName} (${patient.phoneNumber})\n` +
    `Tests: ${tests.map(t => t.displayName).join(', ')}\n` +
    `View in portal: https://medvault.app/lab/orders/${order._id}`
  );
  
  await LabOrder.updateOne({ _id: order._id }, {
    status: 'PATIENT_NOTIFIED',
    $push: { statusHistory: { status: 'PATIENT_NOTIFIED', timestamp: new Date() } }
  });
  
  return order;
}
```

### Lab operator portal endpoints

```typescript
// routes/lab.routes.ts — for lab operators

router.get('/api/lab/orders/pending',
  requireRole('LAB_OPERATOR'),
  async (req, res) => {
    const operator = await User.findById(req.user.userId);
    const orders = await LabOrder.find({
      labId: operator.labId,
      status: { $in: ['PATIENT_NOTIFIED', 'ACKNOWLEDGED_BY_LAB', 'PATIENT_VISITED', 'SAMPLE_COLLECTED', 'IN_PROCESSING'] }
    })
      .populate('patientId doctorId')
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  }
);

router.patch('/api/lab/orders/:id/status',
  requireRole('LAB_OPERATOR'),
  async (req, res) => {
    const { newStatus, note } = req.body;
    
    // Validate transition
    const order = await LabOrder.findById(req.params.id);
    if (!isValidTransition(order.status, newStatus)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }
    
    // Verify operator belongs to this lab
    if (req.user.labId !== order.labId.toString()) {
      return res.status(403).json({ error: 'Not your order' });
    }
    
    await LabOrder.updateOne({ _id: order._id }, {
      status: newStatus,
      $push: { statusHistory: { status: newStatus, timestamp: new Date(), actor: req.user.userId, note } }
    });
    
    // Notify patient on key milestones
    if (newStatus === 'SAMPLE_COLLECTED') {
      await sendWhatsApp(patient.phone, 
        `Your sample has been collected at ${lab.displayName}. Report expected in ${maxTat} hours.`);
    }
    
    res.json({ updated: true });
  }
);

router.post('/api/lab/orders/:id/upload-report',
  requireRole('LAB_OPERATOR'),
  async (req, res) => {
    const order = await LabOrder.findById(req.params.id);
    if (req.user.labId !== order.labId.toString()) {
      return res.status(403).json({ error: 'Not your order' });
    }
    
    // Three upload methods:
    let labReport;
    
    if (req.body.method === 'STRUCTURED') {
      // Operator typed in each test result
      labReport = await LabReport.create({
        patientId: order.patientId,
        labId: order.labId,
        labOrderId: order._id,
        orderedByDoctorId: order.doctorId,
        reportNumber: await generateReportNumber(),
        source: 'MEDVAULT_NATIVE_LAB_PARTNER',
        collectionDate: req.body.collectionDate,
        reportDate: new Date(),
        results: req.body.results,
        uploadedByOperatorUserId: req.user.userId
      });
    } else if (req.body.method === 'PDF_UPLOAD_WITH_OCR') {
      // Lab uploads PDF, our OCR pipeline extracts (calls Phase 4 OCR)
      const pdfUrl = await uploadToR2(req.body.pdfBuffer);
      const ocrResults = await aiClient.ocrLabReport(req.body.pdfBuffer);
      
      labReport = await LabReport.create({
        patientId: order.patientId,
        labId: order.labId,
        labOrderId: order._id,
        orderedByDoctorId: order.doctorId,
        reportNumber: await generateReportNumber(),
        source: 'MEDVAULT_NATIVE_LAB_PARTNER',
        reportDate: new Date(),
        results: ocrResults.results,
        attachmentUrls: [pdfUrl],
        externalUpload: {
          ocrConfidence: ocrResults.confidence,
          verifiedByLab: true                          // lab uploaded, so it's verified
        },
        uploadedByOperatorUserId: req.user.userId
      });
    } else if (req.body.method === 'CSV_UPLOAD') {
      // CSV with LOINC codes + values
      const results = parseCsv(req.body.csvBuffer);
      labReport = await LabReport.create({ /* similar */ });
    }
    
    // Update order
    await LabOrder.updateOne({ _id: order._id }, {
      status: 'REPORT_UPLOADED',
      labReportId: labReport._id,
      $push: { statusHistory: { status: 'REPORT_UPLOADED', timestamp: new Date(), actor: req.user.userId } }
    });
    
    // Detect abnormalities + notify
    const abnormal = detectAbnormalities(labReport.results);
    if (abnormal.hasCritical) {
      // Critical values: notify doctor AND patient immediately
      await notifyDoctorCriticalLab(order.doctorId, labReport);
      await notifyPatientCriticalLab(order.patientId, labReport);
    }
    
    // Standard delivery
    await sendWhatsApp(patient.phone, 
      `Your lab report from ${lab.displayName} is ready.\nView: https://medvault.app/labs/${labReport._id}`);
    
    // Auto-attach to doctor's view (no notification spam — they'll see it next visit)
    
    // Update order final status
    await LabOrder.updateOne({ _id: order._id }, {
      status: 'DELIVERED_TO_DOCTOR',
      $push: { statusHistory: { status: 'DELIVERED_TO_DOCTOR', timestamp: new Date() } }
    });
    
    // Stats update
    await Lab.updateOne({ _id: order.labId }, { $inc: { 'stats.totalReportsUploaded': 1 } });
    
    res.json({ labReport });
  }
);
```

---

## 4. Patient Side — Order View

Patients see their lab orders in the app:

```typescript
router.get('/api/patient/me/lab-orders',
  requireRole('PATIENT'),
  async (req, res) => {
    const orders = await LabOrder.find({ patientId: req.user.patientId })
      .populate('labId', 'displayName address phone')
      .populate('doctorId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(orders);
  }
);
```

Patient can also cancel + go to alternate lab:

```typescript
router.post('/api/patient/lab-orders/:id/use-alternate-lab',
  requireRole('PATIENT'),
  async (req, res) => {
    const { alternateLabName } = req.body;
    await LabOrder.updateOne(
      { _id: req.params.id, patientId: req.user.patientId },
      {
        status: 'CANCELLED_BY_PATIENT',
        patientWentToAlternateLab: true,
        alternateLabName,
        $push: { statusHistory: { status: 'CANCELLED_BY_PATIENT', timestamp: new Date(), actor: req.user.userId, note: `Patient chose alternate: ${alternateLabName}` } }
      }
    );
    
    // Patient uploads report photo later via existing OCR upload flow
    res.json({ updated: true });
  }
);
```

---

## 5. Prescription Service — Small Changes

### Drop these fields

```typescript
// REMOVE from prescription save flow:
prescription.qrCodeData = generatePharmacyQR(...);  // gone
prescription.qrCodeImageUrl = ...;                   // gone
// And all fulfillment-related code in the controller
```

### Add lab orders integration

When doctor creates prescription, if they also ordered tests, create the LabOrder alongside:

```typescript
async function createPrescription(input, doctorUser) {
  // ... existing logic ...
  
  const prescription = await Prescription.create({ /* ... */ });
  
  // If labs ordered in same flow:
  let labOrders = [];
  if (input.labOrder) {
    const order = await labOrderService.createLabOrder({
      ...input.labOrder,
      patientId: input.patientId,
      visitId: input.visitId,
      prescriptionId: prescription._id
    }, doctorUser);
    labOrders.push(order);
  }
  
  // Update visit with both refs
  if (input.visitId) {
    await Visit.updateOne(
      { _id: input.visitId },
      { 
        prescriptionId: prescription._id,
        labOrderIds: labOrders.map(o => o._id),
        status: 'COMPLETED'
      }
    );
  }
  
  return { prescription, labOrders };
}
```

### Replace pharmacy QR with verification QR

```typescript
// services/prescription.service.ts
function generateVerificationQR(prescription: Prescription) {
  const url = `https://medvault.app/verify/prescription/${prescription._id}`;
  return { url, qrImage: QRCode.toDataURL(url) };
}
```

Used in PDF generation, replacing pharmacy QR.

---

## 6. Updated Definition of Done — Phase 2 v2

- [ ] `Appointment` and `DoctorAvailability` collections + code dropped
- [ ] `Visit` collection + service + routes working
- [ ] Pharmacy-related code (services, routes, schema fields) all deleted
- [ ] `Prescription` schema cleaned up — no fulfillment, no pharmacy QR
- [ ] Verification QR generates and resolves at `/verify/prescription/:id`
- [ ] `LabOrder` schema + service working end-to-end
- [ ] Lab discovery API returns labs filtered by city + open-now + favorites
- [ ] Doctor's lab picker returns ranked list with pricing, TAT, distance
- [ ] LabOrder creation triggers WhatsApp to patient AND lab
- [ ] Lab operator can view pending orders in their portal
- [ ] Lab operator can transition order status: acknowledged → patient visited → sample collected → processing → report uploaded
- [ ] Lab operator can upload report via structured form (typed values)
- [ ] Lab operator can upload report via PDF (triggers OCR — Phase 4 code reused)
- [ ] Lab operator can upload report via CSV
- [ ] Patient can cancel order and mark "went to alternate lab"
- [ ] Critical lab values fire immediate notifications to doctor + patient
- [ ] Lab report attaches to ordering doctor's view automatically
- [ ] All 4 safety checks still firing on prescriptions
- [ ] Drug autocomplete still works
- [ ] Tiered consent still works
- [ ] Reference data seeding unchanged

When you can demo: doctor sees patient → writes prescription with safety checks → in same form clicks "Order Tests" → CBC, FBS, HbA1c selected → lab picker shows 5 labs in Noida open right now, Sharma Pathology starred as favorite → doctor picks Sharma Pathology → patient WhatsApp pops up with address + map + cost → patient walks to Sharma Pathology → lab operator opens their portal → sees order → marks "patient visited" → samples collected → 4 hours later uploads structured results → patient gets report PDF on WhatsApp → doctor sees lab values in patient's history next visit — Phase 2 v2 is done.

---

## What This Doesn't Touch

You can leave these alone:
- Drug autocomplete service + Fuse.js indexing
- Drug interaction reference data
- Safety check engine (allergy, DDI, duplicate, dose adjustment)
- Tiered consent service (works the same — just on Visit instead of Appointment)
- Patient timeline aggregation
- Patient summary endpoint base logic (AI additions in Phase 3 layer on top)
- Adherence calculation
- PDF generation pipeline (Puppeteer template just gets a different QR)
- AccessLog
