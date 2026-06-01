# Phase 1 — Foundation: Repo, Schemas, Auth, Verification

**Goal:** Stand up the skeleton of MedVault. By end of Phase 1, you can register a clinic, verify it, onboard a doctor, sign up a patient, and have everything stored in MongoDB with proper auth. No medical features yet — just the entity and trust layer everything depends on.

**Duration:** 2-3 weeks
**Output:** Working backend with auth, full DB schemas, verification workflows for clinic/doctor/patient

---

## 1.1 Repo Structure

Monorepo with 4 services. Use pnpm workspaces or npm workspaces.

```
medvault/
├── apps/
│   ├── backend/              # Node.js Express API
│   ├── frontend/             # Next.js (set up in Phase 5)
│   ├── ai-service/           # FastAPI Python (Phase 3)
│   └── blockchain-worker/    # BullMQ worker (Phase 4)
├── packages/
│   ├── shared-types/         # TypeScript types shared between services
│   ├── shared-constants/     # ICD-10 codes, etc.
│   └── api-contracts/        # OpenAPI specs
├── docker-compose.yml        # MongoDB, Redis locally
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

**Why monorepo:** schemas and types stay in sync across services. You'll need this when AI service and backend talk to each other.

### Backend service skeleton

```
apps/backend/
├── src/
│   ├── config/               # env, db, redis configs
│   ├── models/               # Mongoose schemas
│   ├── routes/               # Express routers per entity
│   ├── controllers/          # Route handlers
│   ├── services/             # Business logic
│   ├── middleware/           # auth, RBAC, rate limit
│   ├── verification/         # HFR, NMC, GST verification logic
│   ├── utils/                # crypto, validation helpers
│   ├── jobs/                 # BullMQ queue producers
│   └── server.ts             # Entry point
├── tests/
├── package.json
└── tsconfig.json
```

Use TypeScript throughout. Mongoose with strict schemas.

---

## 1.2 Environment Setup

### `.env.example`

```bash
# Server
NODE_ENV=development
PORT=4000
API_BASE_URL=http://localhost:4000

# Database
MONGODB_URI=mongodb://localhost:27017/medvault
REDIS_URL=redis://localhost:6379

# Auth
JWT_ACCESS_SECRET=change-me-32-bytes-min
JWT_REFRESH_SECRET=change-me-32-bytes-min-different
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# QR signing
QR_HMAC_SECRET=change-me-32-bytes-min
EMERGENCY_QR_TTL_DAYS=90

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# External APIs
ABDM_BASE_URL=https://sandbox.abdm.gov.in
ABDM_CLIENT_ID=
ABDM_CLIENT_SECRET=
USE_ABDM_MOCK=true
ABDM_MOCK_URL=http://localhost:5050

# Encryption at rest
DATA_ENCRYPTION_KEY=64-hex-chars-for-aes-256-gcm

# Phase 4 (set later)
POLYGON_RPC_URL=
SEPOLIA_RPC_URL=
BLOCKCHAIN_PRIVATE_KEY=
PRESCRIPTION_AUDIT_CONTRACT_ADDRESS=
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes:
      - mongo-data:/data/db
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  mongo-data:
```

Run `docker compose up -d` before starting backend.

---

## 1.3 MongoDB Schemas (Complete)

This is the most important part of Phase 1. Get schemas right and everything else flows. Get them wrong and you'll be migrating data in month 3.

### Core principles

- **All PHI fields encrypted at rest** using AES-256-GCM (use `mongoose-encryption` or roll your own with a `beforeSave` hook)
- **All entities have `createdAt`, `updatedAt`, `_id`**
- **Soft delete via `deletedAt` field** instead of hard delete (audit trail)
- **Versioning via `__v`** (Mongoose default)
- **Indexes on every field you'll query by**

### User (root identity for any human in the system)

```typescript
// models/User.ts
const UserSchema = new Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  email: { type: String, unique: true, sparse: true, index: true },
  passwordHash: { type: String },              // null if OTP-only (patients)
  
  role: { 
    type: String, 
    enum: ['PATIENT', 'DOCTOR', 'CLINIC_ADMIN', 'LAB_OPERATOR', 'PHARMACY_OPERATOR', 'PLATFORM_ADMIN'],
    required: true,
    index: true
  },
  
  // Links to role-specific entity
  patientId: { type: ObjectId, ref: 'Patient' },
  doctorId: { type: ObjectId, ref: 'Doctor' },
  clinicId: { type: ObjectId, ref: 'Clinic' },  // for admin/lab/pharmacy roles
  
  // Status
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },
  
  // Security
  lastLoginAt: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  
  deletedAt: Date
}, { timestamps: true });

UserSchema.index({ role: 1, isActive: 1 });
```

### Patient

```typescript
// models/Patient.ts
const PatientSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', required: true, unique: true },
  medvaultId: { type: String, required: true, unique: true, index: true },  // human-readable, e.g., MV-2026-A7K3M
  abhaId: { type: String, unique: true, sparse: true, index: true },
  abhaAddress: String,                          // e.g., aaditya@abdm
  
  // PHI - encrypted at rest
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  sex: { type: String, enum: ['M', 'F', 'O'], required: true },
  bloodGroup: { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-','UNKNOWN'] },
  
  contact: {
    primaryPhone: String,                       // same as User.phoneNumber usually
    alternatePhone: String,
    email: String,
    address: {
      line1: String, line2: String,
      city: String, state: String, pincode: String
    }
  },
  
  // Clinical core
  allergies: [{
    allergen: { type: String, required: true },        // free text or controlled vocab
    type: { type: String, enum: ['DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER'] },
    severity: { type: String, enum: ['MILD', 'MODERATE', 'SEVERE', 'ANAPHYLACTIC'] },
    reaction: String,
    notedAt: Date,
    notedBy: { type: ObjectId, ref: 'Doctor' }
  }],
  
  chronicConditions: [{
    icd10Code: { type: String, required: true },       // e.g., "E11.9" Type 2 Diabetes
    displayName: String,
    diagnosedAt: Date,
    diagnosedBy: { type: ObjectId, ref: 'Doctor' },
    status: { type: String, enum: ['ACTIVE', 'RESOLVED', 'IN_REMISSION'] }
  }],
  
  // Denormalized for fast safety checks (rebuild via job if it drifts)
  activeMedications: [{
    prescriptionId: { type: ObjectId, ref: 'Prescription' },
    rxnormCui: String,                          // standardized drug ID
    displayName: String,                        // brand name from prescription
    genericName: String,
    drugClass: String,
    startedAt: Date,
    expectedEndAt: Date                         // computed from duration
  }],
  
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  
  // Emergency QR state
  activeEmergencyQrNonces: [String],            // current valid nonces
  
  // Stats (denormalized, updated by jobs)
  stats: {
    totalVisits: { type: Number, default: 0 },
    lastVisitAt: Date,
    averageAiConfidence: Number,
    adherenceScore: { type: String, enum: ['GOOD', 'MODERATE', 'POOR'] }
  },
  
  deletedAt: Date
}, { timestamps: true });

PatientSchema.index({ medvaultId: 1 });
PatientSchema.index({ abhaId: 1 });
PatientSchema.index({ 'allergies.allergen': 1 });
```

### Clinic (verified facility)

```typescript
// models/Clinic.ts
const ClinicSchema = new Schema({
  // Identity
  hfrId: { type: String, unique: true, sparse: true, index: true },   // ABDM HFR ID
  gstin: { type: String, unique: true, sparse: true, index: true },
  legalName: { type: String, required: true },
  displayName: { type: String, required: true },
  
  type: { 
    type: String, 
    enum: ['HOSPITAL', 'CLINIC', 'DIAGNOSTIC_LAB', 'PHARMACY', 'MULTI_SPECIALTY'],
    required: true 
  },
  
  // Address
  address: {
    line1: String, line2: String,
    city: String, state: String, pincode: String,
    geoLocation: { type: { type: String, default: 'Point' }, coordinates: [Number] }
  },
  
  contact: {
    phone: String,
    email: String,
    website: String
  },
  
  // Verification state
  verification: {
    hfrVerified: { type: Boolean, default: false },
    hfrVerifiedAt: Date,
    hfrRawResponse: Schema.Types.Mixed,        // store ABDM response for audit
    
    gstVerified: { type: Boolean, default: false },
    gstVerifiedAt: Date,
    
    domainVerified: { type: Boolean, default: false },
    verifiedDomains: [String],                  // ['apollohospitals.com']
    
    documentsUploaded: [{
      type: { type: String, enum: ['REGISTRATION', 'DOCTOR_DEGREE', 'OWNERSHIP', 'OTHER'] },
      url: String,
      uploadedAt: Date
    }],
    
    manualReviewStatus: { 
      type: String, 
      enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String
  },
  
  trustLevel: { 
    type: String, 
    enum: ['TIER_1_FULL', 'TIER_2_PARTIAL', 'TIER_3_UNVERIFIED'],
    default: 'TIER_3_UNVERIFIED',
    index: true
  },
  
  // Operational
  isActive: { type: Boolean, default: true },
  adminUserIds: [{ type: ObjectId, ref: 'User' }],
  
  // Stats
  stats: {
    totalDoctors: { type: Number, default: 0 },
    totalPrescriptionsIssued: { type: Number, default: 0 }
  },
  
  deletedAt: Date
}, { timestamps: true });

ClinicSchema.index({ 'address.geoLocation': '2dsphere' });
ClinicSchema.index({ trustLevel: 1, isActive: 1 });
```

### Doctor

```typescript
// models/Doctor.ts
const DoctorSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', required: true, unique: true },
  
  fullName: { type: String, required: true },
  nmcRegNumber: { type: String, required: true, unique: true, index: true },
  stateMedicalCouncil: { 
    type: String, 
    enum: ['DMC', 'MMC', 'KMC', 'TNMC', 'WBMC', /* etc */],
    required: true 
  },
  hprId: { type: String, sparse: true, index: true },     // ABDM HPR ID if available
  
  specializations: [{
    code: String,                              // ICD-10 specialty code
    displayName: String,                       // "Cardiology", "Pediatrics"
    isPrimary: Boolean
  }],
  
  qualifications: [{
    degree: String,                            // "MBBS", "MD", "DM"
    institution: String,
    year: Number,
    certificateUrl: String
  }],
  
  // Verification
  verification: {
    nmcVerified: { type: Boolean, default: false },
    nmcVerifiedAt: Date,
    nmcVerificationMethod: { type: String, enum: ['AUTO_API', 'MANUAL_DOCUMENT_REVIEW'] },
    documentsReviewed: { type: Boolean, default: false },
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String
  },
  
  // Affiliations (bilateral confirmation required)
  affiliations: [{
    clinicId: { type: ObjectId, ref: 'Clinic', required: true },
    role: { type: String, enum: ['CONSULTANT', 'RESIDENT', 'VISITING', 'OWNER'] },
    confirmedByClinic: { type: Boolean, default: false },
    confirmedByDoctor: { type: Boolean, default: false },
    activeSince: Date,
    isActive: { type: Boolean, default: true }
  }],
  
  trustLevel: { 
    type: String, 
    enum: ['TIER_1_FULL', 'TIER_2_INDEPENDENT', 'TIER_3_PENDING', 'TIER_4_REJECTED'],
    default: 'TIER_3_PENDING',
    index: true
  },
  
  // Stats
  stats: {
    prescriptionCount: { type: Number, default: 0 },
    patientCount: { type: Number, default: 0 },
    averageAiAlignmentRate: Number             // how often doctor agrees with AI top-1
  },
  
  isActive: { type: Boolean, default: true },
  deletedAt: Date
}, { timestamps: true });

DoctorSchema.index({ nmcRegNumber: 1 });
DoctorSchema.index({ 'affiliations.clinicId': 1, 'affiliations.isActive': 1 });
DoctorSchema.index({ trustLevel: 1 });
```

### Other schemas — defined now, built out in later phases

Create placeholder files with minimal fields for Phase 1; we'll fill them out in their respective phases:

- `Appointment.ts` — patient + doctor + clinic + slot + status
- `Prescription.ts` — Phase 2 builds this fully
- `LabReport.ts` — Phase 2
- `Consent.ts` — Phase 1 implements this (auth flow needs it)
- `AccessLog.ts` — Phase 1 implements (security audit trail)

### Consent (implement now)

```typescript
const ConsentSchema = new Schema({
  patientId: { type: ObjectId, ref: 'Patient', required: true, index: true },
  granteeUserId: { type: ObjectId, ref: 'User', required: true, index: true },
  granteeType: { type: String, enum: ['DOCTOR', 'LAB', 'PHARMACY'], required: true },
  
  scope: [{ 
    type: String, 
    enum: ['FULL', 'PRESCRIPTIONS', 'LAB_REPORTS', 'DIAGNOSES', 'ALLERGIES_AND_CONDITIONS', 'DEMOGRAPHICS']
  }],
  
  grantedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  
  status: { 
    type: String, 
    enum: ['ACTIVE', 'EXPIRED', 'REVOKED', 'AUTO_RENEWED'],
    default: 'ACTIVE',
    index: true
  },
  
  // Tiered consent metadata
  grantMethod: { 
    type: String, 
    enum: ['EXPLICIT_WHATSAPP', 'AUTO_RECENT_DOCTOR', 'EMERGENCY_QR']
  },
  
  revokedAt: Date,
  revokedReason: String,
  
  nonce: { type: String, required: true, unique: true }    // for blockchain hashing later
}, { timestamps: true });

ConsentSchema.index({ patientId: 1, granteeUserId: 1, status: 1 });
ConsentSchema.index({ expiresAt: 1, status: 1 });           // for expiry sweep jobs
```

### AccessLog

```typescript
const AccessLogSchema = new Schema({
  actorUserId: { type: ObjectId, ref: 'User', required: true, index: true },
  actorRole: String,
  
  action: { 
    type: String, 
    enum: ['VIEW_PATIENT', 'CREATE_PRESCRIPTION', 'VIEW_PRESCRIPTION', 
           'UPLOAD_LAB', 'VIEW_LAB', 'EMERGENCY_QR_SCAN', 'CONSENT_GRANT', 'CONSENT_REVOKE'],
    required: true,
    index: true
  },
  
  targetType: String,                          // 'Patient', 'Prescription', etc.
  targetId: ObjectId,
  patientId: { type: ObjectId, ref: 'Patient', index: true },  // for patient timeline
  
  consentId: { type: ObjectId, ref: 'Consent' },
  
  ip: String,
  userAgent: String,
  geoCountry: String,
  geoCity: String,
  
  metadata: Schema.Types.Mixed,                // flexible field for action-specific data
  
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

AccessLogSchema.index({ patientId: 1, createdAt: -1 });
AccessLogSchema.index({ actorUserId: 1, createdAt: -1 });
```

---

## 1.4 Auth System

### JWT structure

Two-token scheme. Access token short-lived, refresh token long-lived.

```typescript
// utils/jwt.ts
import jwt from 'jsonwebtoken';

interface AccessTokenPayload {
  userId: string;
  role: 'PATIENT' | 'DOCTOR' | 'CLINIC_ADMIN' | /* ... */;
  patientId?: string;
  doctorId?: string;
  clinicId?: string;
  trustLevel?: string;
}

export function issueAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_TTL,
    issuer: 'medvault',
    audience: 'medvault-api'
  });
}

export function issueRefreshToken(userId: string, tokenId: string): string {
  return jwt.sign({ userId, tokenId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_TTL
  });
}
```

Refresh tokens stored in Redis with their `tokenId` so you can revoke them (e.g., on logout, password change). Logout = delete refresh token from Redis.

### Patient signup flow (OTP-only)

```typescript
// services/auth.service.ts
async function patientSignup(phoneNumber: string) {
  // 1. Validate phone format
  if (!/^\+91[6-9]\d{9}$/.test(phoneNumber)) throw new Error('Invalid phone');
  
  // 2. Rate limit check (Redis)
  const otpAttempts = await redis.incr(`otp:attempts:${phoneNumber}`);
  await redis.expire(`otp:attempts:${phoneNumber}`, 3600);
  if (otpAttempts > 5) throw new Error('Too many OTP requests');
  
  // 3. Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.setex(`otp:${phoneNumber}`, 300, await bcrypt.hash(otp, 10));  // 5 min TTL
  
  // 4. Send via Twilio WhatsApp
  await twilio.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${phoneNumber}`,
    body: `Your MedVault OTP is ${otp}. Valid for 5 minutes.`
  });
}

async function verifyOtpAndCreatePatient(phoneNumber: string, otp: string) {
  const hashedOtp = await redis.get(`otp:${phoneNumber}`);
  if (!hashedOtp || !(await bcrypt.compare(otp, hashedOtp))) {
    throw new Error('Invalid OTP');
  }
  await redis.del(`otp:${phoneNumber}`);
  
  // Create User + Patient atomically
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    const user = await User.create([{
      phoneNumber,
      role: 'PATIENT',
      isPhoneVerified: true
    }], { session });
    
    const medvaultId = generateMedvaultId();  // MV-2026-A7K3M
    const patient = await Patient.create([{
      userId: user[0]._id,
      medvaultId,
      fullName: '', dateOfBirth: null, sex: null     // filled in profile step
    }], { session });
    
    await User.updateOne({ _id: user[0]._id }, { patientId: patient[0]._id }, { session });
    
    await session.commitTransaction();
    
    return {
      accessToken: issueAccessToken({ 
        userId: user[0]._id.toString(), 
        role: 'PATIENT', 
        patientId: patient[0]._id.toString() 
      }),
      refreshToken: /* ... */
    };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
```

### Doctor/Clinic Admin signup (password-based, with verification gating)

Standard email+password with bcrypt (rounds 12). But: they cannot perform any privileged action until verification completes. Middleware checks `trustLevel`.

### RBAC middleware

```typescript
// middleware/rbac.ts
export function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireTrustLevel(minLevel: string) {
  return async (req, res, next) => {
    if (req.user.role === 'DOCTOR') {
      const doctor = await Doctor.findById(req.user.doctorId).select('trustLevel');
      if (!isAtLeastTier(doctor.trustLevel, minLevel)) {
        return res.status(403).json({ error: 'Doctor verification pending' });
      }
    }
    // similar for clinic
    next();
  };
}
```

Apply on routes: `router.post('/prescriptions', requireRole('DOCTOR'), requireTrustLevel('TIER_1_FULL'), createPrescription)`.

---

## 1.5 Verification Services

### ABDM mock service (run as separate process)

```
apps/abdm-mock/
├── src/
│   ├── routes/
│   │   ├── hfr.ts          # mock HFR lookup
│   │   ├── abha.ts         # mock ABHA validation
│   │   └── consent.ts      # mock consent flow (Phase 2)
│   └── server.ts
└── package.json
```

The mock returns realistic responses matching ABDM's API contract. Run on port 5050.

```typescript
// mock HFR endpoint
app.get('/api/v1/facility/:hfrId', (req, res) => {
  const mockFacilities = {
    'IN0010000001': {
      facilityId: 'IN0010000001',
      facilityName: 'Apollo Hospital Indraprastha',
      facilityType: 'HOSPITAL',
      ownership: 'PRIVATE',
      address: { state: 'Delhi', city: 'New Delhi', pincode: '110076' },
      status: 'ACTIVE'
    }
    // ... more mock facilities
  };
  
  const facility = mockFacilities[req.params.hfrId];
  if (!facility) return res.status(404).json({ error: 'Facility not found' });
  res.json(facility);
});
```

Real ABDM endpoint goes in `verification/abdm.client.ts` with the env switch:

```typescript
const ABDM_BASE = process.env.USE_ABDM_MOCK === 'true'
  ? process.env.ABDM_MOCK_URL
  : process.env.ABDM_BASE_URL;
```

### HFR verification service

```typescript
// verification/clinic.verification.ts
async function verifyClinicHfr(hfrId: string): Promise<HfrVerificationResult> {
  const response = await axios.get(`${ABDM_BASE}/api/v1/facility/${hfrId}`);
  
  if (response.status !== 200) {
    return { verified: false, reason: 'Not found in HFR registry' };
  }
  
  const facility = response.data;
  if (facility.status !== 'ACTIVE') {
    return { verified: false, reason: 'Facility not active in HFR' };
  }
  
  return {
    verified: true,
    facilityName: facility.facilityName,
    type: facility.facilityType,
    address: facility.address,
    rawResponse: facility
  };
}
```

Call this on clinic signup. Store result in `clinic.verification.hfrRawResponse`.

### GST verification

GST has a public verification API at `https://services.gst.gov.in/services/api/search/taxpayerDetails` but it requires registration. For your project: scrape the public search form OR document this as "GST verification via partner API (mocked for demo)."

```typescript
// verification/gst.verification.ts
async function verifyGstin(gstin: string): Promise<GstVerificationResult> {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][Z][0-9A-Z]$/.test(gstin)) {
    return { verified: false, reason: 'Invalid GSTIN format' };
  }
  
  if (process.env.USE_GST_MOCK === 'true') {
    return mockGstVerification(gstin);
  }
  
  // Real implementation when API access available
  // ...
}
```

### Domain verification

Two methods, pick one:

**Method 1 — DNS TXT record:**

```typescript
// verification/domain.verification.ts
import dns from 'dns/promises';

async function verifyDomainViaDns(domain: string, clinicId: string): Promise<boolean> {
  const expectedToken = `medvault-verify=${sha256(clinicId + process.env.DOMAIN_VERIFY_SECRET)}`;
  
  try {
    const records = await dns.resolveTxt(`_medvault.${domain}`);
    return records.some(record => record.join('').includes(expectedToken));
  } catch {
    return false;
  }
}
```

Clinic admin adds a TXT record `_medvault.apollohospitals.com = medvault-verify=abc123...`, then triggers verification.

**Method 2 — Email verification to admin@domain:**

Send a verification link to `admin@apollohospitals.com`, they click it, domain verified. Simpler but less authoritative.

Implement both, let clinic admin choose.

### NMC verification (manual review path)

Since NMC has no clean API, doctor uploads NMC certificate at signup. Verification admin queue:

```typescript
// services/verification.service.ts
async function queueDoctorForManualReview(doctorId: string) {
  await VerificationQueue.create({
    type: 'DOCTOR_NMC',
    targetId: doctorId,
    status: 'PENDING',
    submittedAt: new Date()
  });
  
  // Notify platform admins
  await notifyAdmins(`Doctor ${doctorId} pending NMC verification`);
}
```

Platform admin dashboard shows pending queue. Admin opens, reviews uploaded NMC certificate against NMC website manually, clicks approve/reject. Doctor's `verification.nmcVerified` flips to true, `trustLevel` upgrades.

In your paper, frame this as: "Manual verification workflow with NMC certificate upload; future work includes integration with HPR API as ABDM rollout completes."

---

## 1.6 Encryption at Rest

Use AES-256-GCM for PHI fields. Mongoose middleware approach:

```typescript
// utils/encryption.ts
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(process.env.DATA_ENCRYPTION_KEY!, 'hex');

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}
```

Apply to fields like `Patient.fullName`, `Patient.contact.address.line1`, etc., via Mongoose getters/setters or a plugin. Don't encrypt fields you need to query on (like `medvaultId`, `abhaId`) — encrypt the personally identifying info but keep IDs queryable.

---

## 1.7 API Routes for Phase 1

```
POST   /api/auth/patient/signup-otp           # request OTP
POST   /api/auth/patient/verify-otp           # verify + create account
POST   /api/auth/doctor/signup                # doctor registration (pending verification)
POST   /api/auth/clinic/signup                # clinic admin registration
POST   /api/auth/login                        # email+password for doctor/clinic
POST   /api/auth/refresh                      # refresh access token
POST   /api/auth/logout                       # invalidate refresh token

POST   /api/patient/profile                   # complete profile after OTP
GET    /api/patient/me                        # get own profile
PATCH  /api/patient/me                        # update profile, allergies, conditions

POST   /api/clinic/register                   # full clinic registration
POST   /api/clinic/verify-hfr                 # trigger HFR verification
POST   /api/clinic/verify-domain              # trigger domain verification
POST   /api/clinic/upload-documents           # upload registration certs
GET    /api/clinic/me                         # get clinic status

POST   /api/doctor/register                   # doctor registration
POST   /api/doctor/upload-nmc-certificate     # upload for manual review
POST   /api/doctor/affiliate/:clinicId        # request affiliation
POST   /api/clinic/affiliate/:doctorId/confirm # clinic confirms doctor
GET    /api/doctor/me

POST   /api/admin/verification/clinic/:id/approve   # platform admin approval
POST   /api/admin/verification/doctor/:id/approve
GET    /api/admin/verification/queue
```

---

## 1.8 Testing in Phase 1

Set up Jest + Supertest. Critical test cases:

- OTP rate limiting works (6th request in an hour returns 429)
- OTP expires after 5 minutes
- Patient signup is atomic (User + Patient both created or both fail)
- Doctor cannot create prescription before trust level reaches TIER_1
- HFR verification correctly updates clinic trust level
- Domain verification fails on missing TXT record
- JWT refresh token can be revoked via logout
- Encrypted fields decrypt correctly on read

---

## 1.9 Checklist — Definition of Done for Phase 1

- [ ] Repo structure set up with pnpm workspaces
- [ ] Docker compose runs Mongo + Redis
- [ ] All schemas defined and compile (User, Patient, Clinic, Doctor, Consent, AccessLog)
- [ ] Patient OTP signup works end-to-end via Postman
- [ ] Clinic can register, submit HFR, get verified via mock ABDM
- [ ] Doctor can register, upload NMC cert, admin can approve in queue
- [ ] Doctor-clinic bilateral affiliation works
- [ ] JWT access + refresh token flow works
- [ ] RBAC middleware blocks unauthorized roles
- [ ] Trust level middleware blocks unverified doctors from prescription endpoint (which doesn't exist yet, but test the gate)
- [ ] AES-256-GCM encryption working on sample PHI fields
- [ ] Access logging fires on every authenticated request
- [ ] At least 20 unit tests covering critical paths
- [ ] README explains setup steps

When you can demo: clinic registers → gets HFR-verified → adds doctor → doctor uploads NMC → admin approves → doctor's trust level becomes TIER_1_FULL — Phase 1 is done.

---

## Things to Start In Parallel (Don't Block On Them)

These take real-world time, start now:

1. **Apply for ABDM sandbox access** at sandbox.abdm.gov.in — takes 1-2 weeks
2. **Apply for i2b2 2010 DUA** for Phase 3 NER training — takes 1-2 weeks
3. **Get verbal commitment from 10 friends** for Whisper voice recording (Phase 3)
4. **Start collecting handwritten prescription samples** for Phase 4 OCR training (target: 100 samples by end of month 2)
5. **Look at AI4Bharat IndicSUPERB** to understand the format you'll need to record in
