# Phase 1 — Foundation: Changes Required

**Severity:** Heavy rework
**Effort estimate:** 1.5-2 weeks
**Touches:** User role enum, Clinic schema, Doctor schema, verification service, RBAC, route guards

---

## TL;DR

Phase 1 had clinics as the central verified entity with HFR/GST/domain validation, clinic admins approving doctors via bilateral confirmation, and pharmacies as a clinic type. **All of that goes away.**

What replaces it:
- Doctors are the central verified entity (NMC manual review)
- Doctors run their own practice — "clinic" becomes a free-text field on Doctor profile
- New: Lab entity with platform-admin verification
- New: LabOperator user role
- Assisted onboarding flow for both doctors and labs

---

## Files To Delete

```
apps/backend/src/verification/clinic.verification.ts   # HFR/domain auto-verify
apps/backend/src/verification/gst.verification.ts      # GST validation
apps/backend/src/routes/clinic-admin.routes.ts         # admin endpoints
apps/backend/src/services/clinic-admin.service.ts      # admin business logic
apps/backend/src/controllers/clinic.controller.ts      # if it has admin actions
apps/abdm-mock/                                        # ABDM mock service (entire dir) — can keep if you still want ABHA validation, otherwise drop
```

## Files To Heavily Modify

```
apps/backend/src/models/User.ts                # Role enum change
apps/backend/src/models/Clinic.ts              # → DoctorPractice (subdoc) or major schema simplification
apps/backend/src/models/Doctor.ts              # Drop bilateral affiliations
apps/backend/src/middleware/rbac.ts            # Remove dropped roles
apps/backend/src/services/verification.service.ts  # Strip HFR/GST/domain; keep NMC only
apps/backend/src/routes/                       # Audit all routes — many that referenced clinic_admin or used clinicId are dead
```

## Files To Add

```
apps/backend/src/models/Lab.ts                       # New entity
apps/backend/src/models/LabOperator.ts               # If using subdoc, otherwise lives in User
apps/backend/src/services/lab-onboarding.service.ts  # Assisted onboarding
apps/backend/src/services/doctor-onboarding.service.ts  # Assisted onboarding (rebuild)
apps/backend/src/routes/lab.routes.ts                # Lab endpoints
apps/backend/src/routes/onboarding.routes.ts         # Assisted onboarding endpoints (admin-protected)
```

---

## 1. User Role Enum Changes

### Current

```typescript
role: { 
  type: String, 
  enum: ['PATIENT', 'DOCTOR', 'CLINIC_ADMIN', 'LAB_OPERATOR', 'PHARMACY_OPERATOR', 'PLATFORM_ADMIN'],
}
```

### New

```typescript
role: { 
  type: String, 
  enum: ['PATIENT', 'DOCTOR', 'LAB_OPERATOR', 'PLATFORM_ADMIN'],
}
```

**Migration:** Any existing users with `CLINIC_ADMIN` or `PHARMACY_OPERATOR` → mark `isActive: false`. If you haven't launched, just wipe the user collection and re-seed.

**RBAC middleware:** Find all uses of `requireRole('CLINIC_ADMIN', ...)` or `'PHARMACY_OPERATOR'` and replace with appropriate role. Most will become `requireRole('PLATFORM_ADMIN', 'DOCTOR')` or just `'PLATFORM_ADMIN'`.

---

## 2. Clinic Schema → Drop Entirely (Recommended) or Reduce

### Option A: Drop Clinic collection entirely (recommended)

Move clinic info inside the `Doctor` schema as a subdoc:

```typescript
// models/Doctor.ts — UPDATED
const DoctorSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', required: true, unique: true },
  
  fullName: { type: String, required: true },
  photoUrl: String,
  
  nmcRegNumber: { type: String, required: true, unique: true, index: true },
  stateMedicalCouncil: { type: String, required: true },
  
  specializations: [{ 
    code: String,
    displayName: String,
    isPrimary: Boolean
  }],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    certificateUrl: String
  }],
  languages: [String],                       // NEW
  yearsExperience: Number,                   // NEW
  
  // Practice info (was in Clinic — now embedded)
  practice: {                                // NEW SUBDOC
    displayName: { type: String, required: true },  // "Dr. Sharma's Clinic"
    address: {
      line1: String, line2: String,
      city: { type: String, required: true, index: true },
      state: String, pincode: String,
      geoLocation: { type: { type: String, default: 'Point' }, coordinates: [Number] }
    },
    phone: String,
    operatingHours: [{                       // NEW
      dayOfWeek: { type: Number, min: 0, max: 6 },   // 0=Sunday
      morningSlot: { start: String, end: String },   // "09:00", "13:00"
      eveningSlot: { start: String, end: String }    // null if not applicable
    }],
    consultationFee: Number,
    logoUrl: String,
    signatureUrl: String
  },
  
  // Hospital affiliations — now free text
  hospitalAffiliations: [String],            // SIMPLIFIED — just strings like "Apollo Indraprastha, Visiting Consultant"
  
  // Verification — only NMC manual review remains
  verification: {
    nmcVerified: { type: Boolean, default: false },
    nmcVerifiedAt: Date,
    nmcCertificateUrl: String,
    
    manualReviewStatus: { 
      type: String, 
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_DOCS'],
      default: 'PENDING'
    },
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String
  },
  
  // Onboarding metadata
  onboarding: {                              // NEW
    method: { type: String, enum: ['SELF_SIGNUP', 'ASSISTED_BY_STAFF'], default: 'SELF_SIGNUP' },
    onboardedBy: { type: ObjectId, ref: 'User' },        // who entered the data
    initialLoginCompleted: { type: Boolean, default: false }
  },
  
  // Preferred labs (NEW — for lab picker)
  preferredLabIds: [{ type: ObjectId, ref: 'Lab' }],
  
  trustLevel: { 
    type: String, 
    enum: ['VERIFIED', 'PENDING', 'REJECTED'],     // simpler — no clinic-tier nonsense
    default: 'PENDING'
  },
  
  stats: {
    prescriptionCount: { type: Number, default: 0 },
    patientCount: { type: Number, default: 0 }
  },
  
  isActive: { type: Boolean, default: true },
  deletedAt: Date
}, { timestamps: true });

DoctorSchema.index({ nmcRegNumber: 1 });
DoctorSchema.index({ 'practice.address.city': 1 });
DoctorSchema.index({ 'practice.address.geoLocation': '2dsphere' });
DoctorSchema.index({ trustLevel: 1 });
```

### Option B: Keep Clinic collection minimal (for hospitals only)

If you want to support multi-doctor clinics (hospitals), keep `Clinic` as a lightweight entity with NO verification:

```typescript
const ClinicSchema = new Schema({
  displayName: { type: String, required: true },
  address: { /* ... */ },
  phone: String,
  type: { type: String, enum: ['HOSPITAL', 'MULTI_DOCTOR_CLINIC'] },
  doctorIds: [{ type: ObjectId, ref: 'Doctor' }],
  ownerDoctorId: { type: ObjectId, ref: 'Doctor' },     // senior doctor as owner
  isActive: Boolean
}, { timestamps: true });
```

No HFR, no GST, no domain. Just a grouping mechanism.

**Recommendation:** **Option A.** Simpler. You can add multi-doctor support in v2 if needed.

**Migration:** Move `Clinic.displayName`, `Clinic.address`, etc. into the affiliated `Doctor.practice` field. Drop the Clinic collection.

---

## 3. Lab Entity (NEW)

```typescript
// models/Lab.ts
const LabSchema = new Schema({
  // Basics
  legalName: { type: String, required: true },
  displayName: { type: String, required: true },
  phone: String,
  email: String,
  website: String,
  logoUrl: String,
  
  // Identification
  gstin: { type: String, unique: true, sparse: true },
  nablAccreditationNumber: { type: String, unique: true, sparse: true },   // optional but boosts trust
  tradeLicenseUrl: String,
  premisesPhotoUrl: String,
  
  // Location
  address: {
    line1: String, line2: String,
    city: { type: String, required: true, index: true },
    state: String, pincode: String,
    geoLocation: { type: { type: String, default: 'Point' }, coordinates: [Number] }
  },
  
  // Operating hours
  operatingHours: [{
    dayOfWeek: { type: Number, min: 0, max: 6 },
    open: String,                            // "08:00"
    close: String,                           // "20:00"
    isClosed: { type: Boolean, default: false }      // for holidays/weekly off
  }],
  sampleCollectionHours: [{                  // often shorter than office hours
    dayOfWeek: { type: Number, min: 0, max: 6 },
    open: String,
    close: String
  }],
  holidayDates: [Date],
  
  // Services
  homeCollectionAvailable: { type: Boolean, default: false },
  homeCollectionCharge: Number,
  homeCollectionCities: [String],            // pincodes or city names
  
  // Test catalog
  testsOffered: [{
    loincCode: String,
    displayName: String,
    price: Number,                           // INR
    tatHours: Number,                        // turnaround time in hours
    sampleType: String,                      // "Blood", "Urine", etc.
    fastingRequired: Boolean,
    requiresPrescription: { type: Boolean, default: true }
  }],
  
  // Operators
  operatorUserIds: [{ type: ObjectId, ref: 'User' }],
  
  // Verification
  verification: {
    nablVerified: { type: Boolean, default: false },
    tradeLicenseVerified: { type: Boolean, default: false },
    manualReviewStatus: { 
      type: String, 
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_DOCS'],
      default: 'PENDING'
    },
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String
  },
  
  trustLevel: { 
    type: String, 
    enum: ['VERIFIED', 'PENDING', 'REJECTED'],
    default: 'PENDING'
  },
  
  // Onboarding
  onboarding: {
    method: { type: String, enum: ['SELF_SIGNUP', 'ASSISTED_BY_STAFF'] },
    onboardedBy: { type: ObjectId, ref: 'User' },
    initialLoginCompleted: Boolean
  },
  
  // Stats
  stats: {
    totalOrdersReceived: { type: Number, default: 0 },
    totalReportsUploaded: { type: Number, default: 0 },
    avgTurnaroundHours: Number,
    onTimeRate: Number                      // 0-1
  },
  
  // Commercial (deferred — keep schema ready)
  commercial: {
    isCommercialActive: { type: Boolean, default: false },
    commissionRatePercent: Number,
    bankAccount: {
      accountHolderName: String,
      accountNumber: String,        // encrypt
      ifsc: String,
      bankName: String
    }
  },
  
  isActive: { type: Boolean, default: true },
  deletedAt: Date
}, { timestamps: true });

LabSchema.index({ 'address.city': 1, isActive: 1, trustLevel: 1 });
LabSchema.index({ 'address.geoLocation': '2dsphere' });
LabSchema.index({ 'testsOffered.loincCode': 1 });
```

### LabOperator linkage

When you add a lab operator user:

```typescript
const user = await User.create({
  email,
  phoneNumber,
  passwordHash: hash,
  role: 'LAB_OPERATOR',
  labId: lab._id                          // ADD this field to User schema
});

await Lab.updateOne(
  { _id: lab._id },
  { $push: { operatorUserIds: user._id } }
);
```

Update `User` schema:

```typescript
// Add to UserSchema
labId: { type: ObjectId, ref: 'Lab' },   // for LAB_OPERATOR role
```

---

## 4. Verification Service — Strip Down

### Current

```typescript
// verification/clinic.verification.ts
async function verifyClinicHfr(hfrId) { /* ABDM HFR lookup */ }
async function verifyGstin(gstin) { /* GST API */ }
async function verifyDomainViaDns(domain, clinicId) { /* DNS TXT */ }
```

**Delete all of these files.** Or keep them in a `legacy/` folder for reference, but exclude from app entry.

### New

```typescript
// verification/doctor.verification.ts
async function approveDoctorManually(doctorId: string, reviewerUserId: string, notes?: string) {
  await Doctor.updateOne(
    { _id: doctorId },
    {
      'verification.nmcVerified': true,
      'verification.nmcVerifiedAt': new Date(),
      'verification.manualReviewStatus': 'APPROVED',
      'verification.reviewedBy': reviewerUserId,
      'verification.reviewedAt': new Date(),
      'verification.reviewNotes': notes,
      'trustLevel': 'VERIFIED'
    }
  );
  
  // Send approval notification
  const doctor = await Doctor.findById(doctorId).populate('userId');
  await sendWhatsApp(doctor.userId.phoneNumber,
    `Welcome to MedVault, Dr. ${doctor.fullName}! Your account is verified. Log in at https://medvault.app/login`
  );
}

async function rejectDoctor(doctorId, reviewerUserId, reason) { /* similar */ }
async function requestMoreDocs(doctorId, reviewerUserId, missingDocs) { /* similar */ }
```

```typescript
// verification/lab.verification.ts  — NEW
async function approveLabManually(labId, reviewerUserId, notes?) {
  await Lab.updateOne(
    { _id: labId },
    {
      'verification.manualReviewStatus': 'APPROVED',
      'verification.reviewedBy': reviewerUserId,
      'verification.reviewedAt': new Date(),
      'verification.reviewNotes': notes,
      'trustLevel': 'VERIFIED'
    }
  );
  // Notify lab operators with login credentials
}
```

---

## 5. Assisted Onboarding (NEW)

The biggest behavioral change. Anyone with `PLATFORM_ADMIN` role (you + your team) can register doctors and labs on their behalf.

### Doctor assisted onboarding endpoint

```typescript
// routes/onboarding.routes.ts
router.post('/onboarding/doctor',
  requireRole('PLATFORM_ADMIN'),
  async (req, res) => {
    const input = req.body;
    
    // 1. Create User
    const tempPassword = generateTempPassword();
    const user = await User.create({
      phoneNumber: input.phone,
      email: input.email,
      passwordHash: await bcrypt.hash(tempPassword, 12),
      role: 'DOCTOR',
      isPhoneVerified: false,                     // doctor verifies on first login
      isActive: true
    });
    
    // 2. Create Doctor
    const doctor = await Doctor.create({
      userId: user._id,
      fullName: input.fullName,
      photoUrl: input.photoUrl,
      nmcRegNumber: input.nmcRegNumber,
      stateMedicalCouncil: input.stateMedicalCouncil,
      specializations: input.specializations,
      qualifications: input.qualifications,
      languages: input.languages,
      yearsExperience: input.yearsExperience,
      practice: input.practice,
      hospitalAffiliations: input.hospitalAffiliations || [],
      verification: {
        nmcCertificateUrl: input.nmcCertificateUrl,
        manualReviewStatus: 'PENDING'
      },
      onboarding: {
        method: 'ASSISTED_BY_STAFF',
        onboardedBy: req.user.userId,
        initialLoginCompleted: false
      },
      trustLevel: 'PENDING'
    });
    
    await User.updateOne({ _id: user._id }, { doctorId: doctor._id });
    
    // 3. Queue NMC review (it's already in PENDING — just notify platform admins)
    await notifyPlatformAdmins(`New doctor pending review: ${doctor.fullName} (NMC ${doctor.nmcRegNumber})`);
    
    // 4. Don't send credentials yet — wait until verified
    res.json({
      doctor,
      message: 'Doctor created. Awaiting platform admin verification. Credentials will be sent via WhatsApp once approved.'
    });
  }
);

router.post('/onboarding/doctor/:id/send-credentials',
  requireRole('PLATFORM_ADMIN'),
  async (req, res) => {
    // Used after verification to send login credentials
    const doctor = await Doctor.findById(req.params.id).populate('userId');
    
    if (doctor.verification.manualReviewStatus !== 'APPROVED') {
      return res.status(400).json({ error: 'Doctor not yet verified' });
    }
    
    // Generate fresh temp password, force change on first login
    const tempPassword = generateTempPassword();
    await User.updateOne(
      { _id: doctor.userId._id },
      { passwordHash: await bcrypt.hash(tempPassword, 12), mustChangePassword: true }
    );
    
    await sendWhatsApp(doctor.userId.phoneNumber,
      `Welcome to MedVault, Dr. ${doctor.fullName}!\n\n` +
      `Your login:\nPhone: ${doctor.userId.phoneNumber}\nTemp password: ${tempPassword}\n\n` +
      `Login: https://medvault.app/login\nYou'll be asked to set a new password on first login.`
    );
    
    res.json({ sent: true });
  }
);
```

### Add `mustChangePassword` to User schema

```typescript
// User schema addition
mustChangePassword: { type: Boolean, default: false }
```

Force a password reset prompt on first login if this flag is true.

### Lab assisted onboarding

Mirror of doctor onboarding:

```typescript
router.post('/onboarding/lab',
  requireRole('PLATFORM_ADMIN'),
  async (req, res) => {
    const input = req.body;
    
    // Create lab
    const lab = await Lab.create({
      legalName: input.legalName,
      displayName: input.displayName,
      phone: input.phone,
      email: input.email,
      gstin: input.gstin,
      nablAccreditationNumber: input.nablAccreditationNumber,
      tradeLicenseUrl: input.tradeLicenseUrl,
      address: input.address,
      operatingHours: input.operatingHours,
      sampleCollectionHours: input.sampleCollectionHours,
      homeCollectionAvailable: input.homeCollectionAvailable,
      testsOffered: input.testsOffered,
      verification: { manualReviewStatus: 'PENDING' },
      onboarding: { method: 'ASSISTED_BY_STAFF', onboardedBy: req.user.userId },
      trustLevel: 'PENDING'
    });
    
    // Create operators
    for (const opInput of input.operators) {
      const tempPassword = generateTempPassword();
      const opUser = await User.create({
        phoneNumber: opInput.phone,
        email: opInput.email,
        passwordHash: await bcrypt.hash(tempPassword, 12),
        role: 'LAB_OPERATOR',
        labId: lab._id,
        mustChangePassword: true
      });
      await Lab.updateOne({ _id: lab._id }, { $push: { operatorUserIds: opUser._id } });
    }
    
    res.json({ lab });
  }
);
```

---

## 6. Patient Quick-Register (NEW — In-Clinic Patient Signup)

Doctor or their staff registers patient on the spot. Same OTP verification, but staff-driven UI.

```typescript
// routes/onboarding.routes.ts
router.post('/onboarding/patient/initiate',
  requireRole('DOCTOR', 'PLATFORM_ADMIN'),
  async (req, res) => {
    const { phoneNumber, fullName } = req.body;
    
    // Check if patient already exists
    const existing = await User.findOne({ phoneNumber, role: 'PATIENT' });
    if (existing) {
      return res.json({ alreadyRegistered: true, medvaultId: existing.patientId?.medvaultId });
    }
    
    // Send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(`otp:quickreg:${phoneNumber}`, 600, await bcrypt.hash(otp, 10));
    
    await sendWhatsApp(phoneNumber,
      `Your MedVault OTP is ${otp}. Read this to the doctor's staff to complete registration. Valid for 10 minutes.`
    );
    
    res.json({ otpSent: true, expiresIn: 600 });
  }
);

router.post('/onboarding/patient/complete',
  requireRole('DOCTOR', 'PLATFORM_ADMIN'),
  async (req, res) => {
    const { phoneNumber, otp, fullName, dateOfBirth, sex } = req.body;
    
    const hashedOtp = await redis.get(`otp:quickreg:${phoneNumber}`);
    if (!hashedOtp || !(await bcrypt.compare(otp, hashedOtp))) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    await redis.del(`otp:quickreg:${phoneNumber}`);
    
    // Create user + patient atomically
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      
      const user = await User.create([{
        phoneNumber,
        role: 'PATIENT',
        isPhoneVerified: true
      }], { session });
      
      const medvaultId = generateMedvaultId();
      const patient = await Patient.create([{
        userId: user[0]._id,
        medvaultId,
        fullName,
        dateOfBirth,
        sex,
        onboarding: {                  // ADD to Patient schema
          method: 'QUICK_REGISTER_BY_STAFF',
          registeredBy: req.user.userId
        }
      }], { session });
      
      await User.updateOne({ _id: user[0]._id }, { patientId: patient[0]._id }, { session });
      await session.commitTransaction();
      
      // Send setup link to patient
      await sendWhatsApp(phoneNumber,
        `Welcome to MedVault! Your ID: ${medvaultId}\n\n` +
        `Complete your profile (allergies, conditions, etc.):\nhttps://medvault.app/setup?phone=${phoneNumber}`
      );
      
      res.json({ patient: patient[0], medvaultId });
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }
);
```

---

## 7. API Routes — Final List for Phase 1 v2

### Auth (mostly unchanged)
```
POST   /api/auth/patient/signup-otp           # Patient self-signup
POST   /api/auth/patient/verify-otp
POST   /api/auth/login                        # All non-patient roles (doctor, lab op, admin)
POST   /api/auth/login/first-time             # Forces password change if mustChangePassword=true
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Assisted onboarding (NEW)
```
POST   /api/onboarding/doctor                 # Admin creates doctor
POST   /api/onboarding/doctor/:id/send-credentials
POST   /api/onboarding/lab                    # Admin creates lab
POST   /api/onboarding/lab/:id/send-credentials
POST   /api/onboarding/patient/initiate       # Staff initiates patient signup
POST   /api/onboarding/patient/complete
```

### Doctor self-signup (now optional path)
```
POST   /api/doctor/self-signup                # Doctor signs themselves up (still possible, just rarer)
POST   /api/doctor/upload-nmc-certificate
GET    /api/doctor/me
PATCH  /api/doctor/me
PATCH  /api/doctor/me/preferred-labs          # NEW — manage lab favorites
```

### Lab management (NEW)
```
GET    /api/labs/me                           # Lab operator's lab details
PATCH  /api/labs/me                           # Update operating hours, test catalog, etc.
GET    /api/labs/discover                     # Doctor uses this — search labs (Phase 2 covers full implementation)
```

### Platform admin (verification queue)
```
GET    /api/admin/verification/doctors/queue
POST   /api/admin/verification/doctor/:id/approve
POST   /api/admin/verification/doctor/:id/reject
POST   /api/admin/verification/doctor/:id/request-docs

GET    /api/admin/verification/labs/queue
POST   /api/admin/verification/lab/:id/approve
POST   /api/admin/verification/lab/:id/reject
```

### Deleted routes
```
DELETE: /api/clinic/register                  # gone
DELETE: /api/clinic/verify-hfr                # gone
DELETE: /api/clinic/verify-domain             # gone
DELETE: /api/clinic/upload-documents          # gone (use /onboarding/doctor instead)
DELETE: /api/doctor/affiliate/:clinicId       # gone
DELETE: /api/clinic/affiliate/:doctorId/confirm  # gone
DELETE: /api/admin/verification/clinic/...    # gone
```

---

## 8. Updated Definition of Done — Phase 1 v2

Replace the old checklist with:

- [ ] User role enum updated (PATIENT, DOCTOR, LAB_OPERATOR, PLATFORM_ADMIN only)
- [ ] Clinic collection dropped (or simplified per Option B)
- [ ] Doctor schema updated with embedded practice info, free-text affiliations
- [ ] Lab schema created with full operating hours + test catalog + verification fields
- [ ] User schema has `labId` field for LAB_OPERATOR linkage
- [ ] User schema has `mustChangePassword` flag
- [ ] HFR/GST/domain verification code deleted (or moved to legacy/)
- [ ] Doctor manual verification flow (NMC cert upload + admin approval)
- [ ] Lab manual verification flow (trade license + admin approval)
- [ ] Assisted onboarding endpoint works: admin creates doctor → email/WhatsApp delivered → doctor logs in → password change flow
- [ ] Patient quick-register flow works: staff initiates OTP → patient reads OTP → staff completes registration → patient receives setup link
- [ ] RBAC middleware purged of dropped roles
- [ ] All clinic-admin routes deleted, no 404 references in frontend
- [ ] Migration script (or DB wipe + reseed) executed cleanly

When you can demo: platform admin opens admin panel → adds Dr. Sharma manually (uploads NMC cert, fills practice info) → submits → reviews own queue → approves → Dr. Sharma gets WhatsApp with credentials → logs in → forced to change password → sees empty dashboard. Then: Dr. Sharma's reception staff opens "Quick Register" → patient walks in → enters phone → patient gets OTP → reads aloud → staff types it → patient is registered. — Phase 1 v2 is done.

---

## What This Doesn't Touch

You can leave these alone — they work the same:
- AES-256-GCM encryption helpers
- JWT issue/verify utilities
- Redis connection
- AccessLog schema
- Reference data seeding (RxNorm, ICD-10, LOINC, India brands)
- Mongoose setup / connection logic
