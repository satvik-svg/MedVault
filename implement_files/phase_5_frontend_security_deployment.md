# Phase 5 — Frontend Polish, Emergency QR Security, Deployment, Evaluation

**Goal:** Pull everything together. Build the full Next.js frontend with a clean medical-Indian aesthetic, implement the emergency QR security system (the final research contribution), deploy the whole stack, run the comprehensive evaluation, and write the paper.

**Duration:** 3-4 weeks
**Prerequisites:** Phases 1-4 complete and stable
**Output:** Deployed full-stack MedVault, working emergency QR with all security guarantees, evaluation results, paper draft

---

## 5.1 Frontend Setup

### Stack

- **Next.js 14** (App Router) — server components reduce bundle size
- **TypeScript** strict mode
- **Tailwind CSS** + **shadcn/ui** as base component library
- **Zustand** for global state (lighter than Redux, simpler than Context for many slices)
- **TanStack Query** for server state, caching, mutations
- **React Hook Form** + **Zod** for form validation
- **Framer Motion** for transitions
- **Recharts** for data visualization (lab trends, adherence charts)
- **next-pwa** for the PWA install flow on mobile

### Repo structure

```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/
│   │   │   └── verify-otp/page.tsx
│   │   ├── (patient)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── prescriptions/
│   │   │   ├── records/
│   │   │   ├── appointments/
│   │   │   ├── emergency-qr/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── (doctor)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── patient/[id]/page.tsx
│   │   │   ├── prescriptions/new/page.tsx
│   │   │   └── schedule/page.tsx
│   │   ├── (clinic)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── doctors/page.tsx
│   │   │   ├── verification/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── (admin)/
│   │   │   ├── verification-queue/page.tsx
│   │   │   └── audit/page.tsx
│   │   ├── (pharmacy)/
│   │   │   ├── scan/page.tsx
│   │   │   └── history/page.tsx
│   │   ├── (lab)/
│   │   │   └── upload/page.tsx
│   │   ├── api/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn primitives
│   │   ├── shared/                   # cross-role components
│   │   │   ├── TrustBadge.tsx
│   │   │   ├── BlockchainBadge.tsx
│   │   │   ├── MedicationCard.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── patient/
│   │   ├── doctor/
│   │   │   ├── PatientSummary.tsx
│   │   │   ├── PrescriptionForm.tsx
│   │   │   ├── SafetyCheckAlert.tsx
│   │   │   └── MedicationAutocomplete.tsx
│   │   └── prescription/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useConsent.ts
│   │   ├── useSafetyChecks.ts
│   │   └── usePrescriptionForm.ts
│   ├── lib/
│   │   ├── api/                      # API client
│   │   ├── auth/
│   │   ├── stores/                   # Zustand stores
│   │   └── utils/
│   └── types/
├── public/
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## 5.2 Design System: Medical + Indian Aesthetic

This is the "sleek, beautiful, smooth" part you wanted. The goal: looks credible to doctors AND feels modern.

### Color palette

```css
/* globals.css */
@layer base {
  :root {
    /* Brand: clinical trust meets warmth */
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    
    /* Primary: a calmer teal (medical credibility, not corporate blue) */
    --primary: 174 72% 26%;             /* #138984 — deep teal */
    --primary-foreground: 0 0% 100%;
    
    /* Secondary: warm accent (Indian context — saffron-adjacent but muted) */
    --secondary: 32 75% 58%;            /* #e6a350 — warm amber */
    --secondary-foreground: 222 47% 11%;
    
    /* Accent for AI/insights */
    --accent: 254 60% 60%;              /* #7867e0 — soft violet for AI flagged */
    
    /* Status */
    --success: 142 71% 35%;
    --warning: 38 92% 50%;
    --danger: 0 84% 56%;
    
    /* Severity tiers for safety alerts */
    --severity-contraindicated: 0 100% 36%;     /* darker red */
    --severity-severe: 0 84% 56%;
    --severity-moderate: 38 92% 50%;
    --severity-minor: 217 91% 60%;
    
    /* Surfaces */
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
    
    --radius: 0.625rem;                 /* slightly larger than default for softness */
  }
  
  .dark {
    --background: 222 47% 6%;
    --foreground: 210 40% 98%;
    --primary: 174 60% 45%;
    /* ... */
  }
}
```

### Typography

Use two fonts:

- **Inter** for UI text (clean, neutral, supports Latin + Devanagari well)
- **Source Serif Pro** for prescription PDFs and printed documents (medical tradition)

```typescript
// app/layout.tsx
import { Inter, Source_Serif_Pro, Noto_Sans_Devanagari } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap'
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap'
});

const serif = Source_Serif_Pro({ 
  subsets: ['latin'], 
  weight: ['400', '600'], 
  variable: '--font-serif' 
});
```

### Component library

Install shadcn/ui as your base — but customize tokens, don't use them raw. The point is to start with accessible primitives and theme them.

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card dialog form input select toast badge alert
```

### Design principles to follow

1. **Whitespace is a feature** — generous padding (`p-6`, `p-8`), large click targets (44px+), don't cram
2. **Subtle elevation** — use `shadow-sm` and `shadow-md` sparingly; rely on `border` for separation
3. **One accent at a time** — primary buttons only on the main action; everything else `outline` or `ghost`
4. **Indian context cues** — `₹` symbol, Hindi+English copy where natural, names with diacritics rendered correctly
5. **Trust signals everywhere** — verification badges on doctors/clinics, blockchain hash on prescriptions, "anchored Nov 2026" timestamps
6. **Reduced motion respect** — `motion-reduce:transition-none` on every transition
7. **Mobile-first** — patients use phones, doctors use tablets in OPDs. Test on 360px and 768px.

### Reference components

**TrustBadge** (used everywhere a doctor/clinic name appears):

```tsx
// components/shared/TrustBadge.tsx
interface TrustBadgeProps {
  level: 'TIER_1_FULL' | 'TIER_2_PARTIAL' | 'TIER_3_UNVERIFIED' | 'TIER_4_REJECTED';
  type: 'DOCTOR' | 'CLINIC';
  className?: string;
}

export function TrustBadge({ level, type, className }: TrustBadgeProps) {
  const config = {
    TIER_1_FULL: {
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      label: type === 'DOCTOR' ? 'NMC Verified' : 'HFR + Domain Verified',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    TIER_2_PARTIAL: {
      icon: <Shield className="w-3.5 h-3.5" />,
      label: 'Partially Verified',
      classes: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    TIER_3_UNVERIFIED: {
      icon: <ShieldQuestion className="w-3.5 h-3.5" />,
      label: 'Verification Pending',
      classes: 'bg-slate-50 text-slate-600 border-slate-200'
    },
    TIER_4_REJECTED: {
      icon: <ShieldX className="w-3.5 h-3.5" />,
      label: 'Verification Failed',
      classes: 'bg-rose-50 text-rose-700 border-rose-200'
    }
  }[level];
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border',
      config.classes,
      className
    )}>
      {config.icon}
      {config.label}
    </span>
  );
}
```

**BlockchainBadge** (on every prescription):

```tsx
// components/shared/BlockchainBadge.tsx
export function BlockchainBadge({ prescription }: { prescription: Prescription }) {
  const { data } = useQuery({
    queryKey: ['verify-prescription', prescription._id],
    queryFn: () => verifyPrescription(prescription._id),
    enabled: prescription.blockchain?.status === 'ANCHORED'
  });
  
  if (prescription.blockchain?.status !== 'ANCHORED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="w-3 h-3 animate-pulse" />
        Anchoring to blockchain...
      </span>
    );
  }
  
  if (data?.tampered) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3.5 h-3.5" />
        TAMPERED — content modified after anchoring
      </span>
    );
  }
  
  return (
    <a
      href={data?.explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition"
    >
      <Link2 className="w-3 h-3" />
      <span>Blockchain Verified</span>
      <span className="font-mono">{prescription.blockchain.contentHash.slice(0, 8)}…</span>
    </a>
  );
}
```

### Smoothness — micro-interactions that matter

- Skeleton states for every async section (not spinners — they look amateur)
- Optimistic updates on mutations (TanStack Query `onMutate`)
- Stagger reveals: cards animate in 50ms apart with Framer
- Toast on every action (success and error), auto-dismiss in 4s
- Active states with `active:scale-95` for buttons (tactile)
- Subtle gradient backgrounds on hero cards (`bg-gradient-to-br from-primary/5 to-secondary/5`)

---

## 5.3 Key Screens to Build

I'll detail the four most important ones. Others follow the same patterns.

### Screen 1: Doctor — Patient Summary Dashboard

This is the most important doctor-facing screen. Phase 2 built the backend, now build the UI.

```
+--------------------------------------------------------+
| ← Back     Patient: Rajesh Kumar, M, 47                |
|            MV-2026-A7K3M • Last visit: 12 Apr 2026     |
+--------------------------------------------------------+
| [Critical Strip: red bg]                               |
| ⚠ Allergies: Penicillin (Severe), Sulfa drugs (Mild)   |
| ⚠ Active conditions: T2DM (since 2019), Hypertension   |
| ℹ Active meds: Metformin 500mg BD, Telmisartan 40mg OD |
+--------------------------------------------------------+
| [AI Summary]                                           |
| 47yo male with T2DM and HTN on standard regimen. HbA1c |
| trending up (6.8 → 7.4 over 6mo). Adherence moderate   |
| (2 refill gaps). Presents today with: blurred vision...|
+--------------------------------------------------------+
| [Recurrence Match: violet accent]                      |
| Similar presentation 4 months ago — diagnosed as       |
| diabetic retinopathy. [View previous visit →]          |
+--------------------------------------------------------+
| [Pre-visit AI suggestions]                             |
| Top 3 differentials (calibrated, India-prevalence):    |
| 1. Diabetic retinopathy (62%)                          |
| 2. Hypertensive retinopathy (18%)                      |
| 3. Cataract progression (12%)                          |
+--------------------------------------------------------+
| [Tabs: Timeline | Medications | Labs | Visits]         |
| Recent timeline events...                              |
+--------------------------------------------------------+
| [Action buttons]                                       |
| [New Prescription] [Order Labs] [Schedule Follow-up]   |
+--------------------------------------------------------+
```

```tsx
// app/(doctor)/patient/[id]/page.tsx
export default async function PatientPage({ params }: { params: { id: string } }) {
  const summary = await fetchPatientSummary(params.id);
  
  return (
    <main className="container max-w-6xl py-6 space-y-4">
      <PatientHeader patient={summary.patient} />
      
      <CriticalStrip 
        allergies={summary.patient.allergies}
        conditions={summary.patient.chronicConditions}
        activeMeds={summary.patient.activeMedications}
      />
      
      <Card className="border-l-4 border-l-violet-500 bg-violet-50/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-sm text-violet-700">
            <Sparkles className="w-4 h-4" />
            AI Summary
          </div>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          {summary.aiSummaryParagraph}
        </CardContent>
      </Card>
      
      {summary.symptomRecurrence?.length > 0 && (
        <RecurrenceMatchCard matches={summary.symptomRecurrence} />
      )}
      
      <AIDifferentialCard diagnoses={summary.preVisitDiagnoses} />
      
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="labs">Labs</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline">
          <PatientTimeline patientId={params.id} />
        </TabsContent>
        
        <TabsContent value="medications">
          <MedicationTimelineGantt medications={summary.medicationTimeline} />
        </TabsContent>
        
        <TabsContent value="labs">
          <LabTrendsCharts trends={summary.labTrends} />
        </TabsContent>
        
        <TabsContent value="visits">
          <VisitsList patientId={params.id} />
        </TabsContent>
      </Tabs>
      
      <ActionBar>
        <Button asChild>
          <Link href={`/prescriptions/new?patientId=${params.id}`}>
            <Plus className="w-4 h-4" /> New Prescription
          </Link>
        </Button>
        <Button variant="outline">Order Labs</Button>
        <Button variant="outline">Schedule Follow-up</Button>
      </ActionBar>
    </main>
  );
}
```

### Screen 2: Doctor — Prescription Form

The most complex single screen. All Phase 2 safety checks fire here in real-time.

```tsx
// components/doctor/PrescriptionForm.tsx
export function PrescriptionForm({ patientId }: { patientId: string }) {
  const form = useForm<PrescriptionInput>({
    resolver: zodResolver(prescriptionSchema)
  });
  
  const { fields: medFields, append, remove } = useFieldArray({
    control: form.control,
    name: 'medications'
  });
  
  // Real-time safety check per medication
  const medications = form.watch('medications');
  const safetyResults = useSafetyChecks(patientId, medications);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitPrescription)} className="space-y-6">
        {/* Diagnosis section */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <DiagnosisInput control={form.control} name="diagnosis" />
          </CardContent>
        </Card>
        
        {/* Medications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Medications</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyMedication)}>
              <Plus className="w-4 h-4" /> Add medication
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {medFields.map((field, index) => (
              <div key={field.id} className="relative">
                <MedicationRow 
                  control={form.control}
                  index={index}
                  patientId={patientId}
                />
                
                {/* Safety checks render below each medication */}
                {safetyResults[index] && (
                  <SafetyCheckPanel 
                    result={safetyResults[index]}
                    onOverride={(field, reason) => 
                      form.setValue(`medications.${index}.overrides.${field}`, { acknowledged: true, reason })
                    }
                  />
                )}
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2"
                  onClick={() => remove(index)}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Lab orders, follow-up — similar pattern */}
        
        <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4 border-t">
          <Button type="button" variant="outline">Save Draft</Button>
          <Button 
            type="submit"
            disabled={hasUnresolvedCriticalSafety(safetyResults)}
          >
            Issue Prescription
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### MedicationRow with autocomplete

```tsx
function MedicationRow({ control, index, patientId }: MedicationRowProps) {
  const [query, setQuery] = useState('');
  
  const { data: suggestions } = useQuery({
    queryKey: ['drug-search', query],
    queryFn: () => searchDrugs(query),
    enabled: query.length >= 2,
    staleTime: 60_000
  });
  
  return (
    <div className="grid grid-cols-12 gap-3 p-4 rounded-lg border bg-card">
      <div className="col-span-5">
        <Controller
          name={`medications.${index}.drug`}
          control={control}
          render={({ field }) => (
            <Combobox
              value={field.value}
              onChange={field.onChange}
              onInputChange={setQuery}
              options={suggestions || []}
              renderOption={(drug) => (
                <div className="flex flex-col">
                  <span className="font-medium">{drug.brandName || drug.genericName}</span>
                  <span className="text-xs text-muted-foreground">
                    {drug.genericName} {drug.commonStrengths?.[0]}
                  </span>
                  {drug.isIndianBrand && (
                    <Badge variant="outline" className="text-xs w-fit mt-1">India Brand</Badge>
                  )}
                </div>
              )}
              placeholder="Type drug name (e.g., Crocin, Metformin)…"
            />
          )}
        />
      </div>
      
      <div className="col-span-2">
        <StrengthInput control={control} name={`medications.${index}.strength`} />
      </div>
      
      <div className="col-span-2">
        <FrequencySelect control={control} name={`medications.${index}.dosage.frequency`} />
      </div>
      
      <div className="col-span-2">
        <DurationInput control={control} name={`medications.${index}.dosage.duration`} />
      </div>
      
      <div className="col-span-1 flex items-end">
        {/* Form selector */}
      </div>
    </div>
  );
}
```

### useSafetyChecks hook

```tsx
// hooks/useSafetyChecks.ts
export function useSafetyChecks(patientId: string, medications: Medication[]) {
  const debounced = useDebounce(medications, 400);
  
  return useQueries({
    queries: debounced.map((med, index) => ({
      queryKey: ['safety-check', patientId, med.rxnormCui, med.strength],
      queryFn: () => checkMedicationSafety(patientId, med),
      enabled: !!med.rxnormCui,
      staleTime: 30_000
    }))
  }).map(r => r.data);
}
```

### SafetyCheckPanel

```tsx
function SafetyCheckPanel({ result, onOverride }: Props) {
  if (!result || !hasIssues(result)) {
    return (
      <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> All safety checks passed
      </div>
    );
  }
  
  return (
    <div className="mt-2 space-y-2">
      {result.allergyConflict && (
        <SafetyAlert
          severity="contraindicated"
          title="Allergy Conflict"
          description={result.allergyDetails}
          onOverride={(reason) => onOverride('allergy', reason)}
        />
      )}
      
      {result.interactionConflicts.map((conflict, i) => (
        <SafetyAlert
          key={i}
          severity={conflict.severity.toLowerCase()}
          title={`Interaction: ${conflict.severity}`}
          description={`With ${conflict.withDrugName}. ${conflict.managementNote}`}
          onOverride={(reason) => onOverride(`interaction-${i}`, reason)}
        />
      ))}
      
      {result.duplicateTherapyDetected && (
        <SafetyAlert
          severity="moderate"
          title="Duplicate Therapy"
          description={result.duplicateTherapyDetails}
          onOverride={(reason) => onOverride('duplicate', reason)}
        />
      )}
      
      {result.doseAdjustmentRecommended && (
        <SafetyAlert
          severity="info"
          title="Dose Adjustment Recommended"
          description={result.doseAdjustmentReason}
          dismissible
        />
      )}
    </div>
  );
}
```

### Screen 3: Patient — Dashboard

Simpler. Focus: clarity, calm, no clutter.

```
+--------------------------------------------+
| Namaste, Rajesh                            |
| Your MedVault ID: MV-2026-A7K3M [QR]       |
+--------------------------------------------+
| [3 status cards]                           |
| Next appointment   Active meds   Pending   |
| Tomorrow 10am      3 ongoing     1 lab     |
+--------------------------------------------+
| [Active medications — large cards]         |
| Metformin 500mg                            |
| Twice daily, after meals                   |
| Day 12 of 90 • Refill in 78 days           |
| [✓ Taken today] [Skip] [Side effect]       |
+--------------------------------------------+
| [Recent records]                           |
| Lab report — CBC                  2d ago   |
| Prescription — Dr. Sharma         5d ago   |
| Appointment — Dr. Mehta           1w ago   |
+--------------------------------------------+
| [Emergency QR section — bottom]            |
| 🚨 Emergency Access                        |
| Show this QR in emergencies                |
| [View Emergency QR →]                      |
+--------------------------------------------+
```

### Screen 4: Clinic Admin — Verification Dashboard

```
+--------------------------------------------+
| Apollo Hospital, Indraprastha              |
| HFR: IN0010000001 ✓ • Domain: ✓ • GST: ✓   |
+--------------------------------------------+
| Trust Level: TIER_1_FULL                   |
+--------------------------------------------+
| Doctors (12)                               |
| [Table:                                    |
|   Name | NMC | Status | Affiliation       |
|   Dr. Sharma | 12345 | Verified | ✓       |
|   Dr. Mehta | 67890 | Pending NMC | ✓     |
|                                            |
| Actions: Confirm affiliations, Add doctor  |
+--------------------------------------------+
| Pending Verifications                      |
| - 2 doctors awaiting NMC approval          |
| - 0 patients consents to confirm           |
+--------------------------------------------+
```

---

## 5.4 Mobile + PWA Strategy

Patient app must work as PWA — installable, works offline for viewing records.

### Setup

```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.medvault\.app\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst'
    }
  ]
});

module.exports = withPWA({
  // ... rest of config
});
```

### Offline strategy

- Patient records, prescriptions, lab reports — cached for offline read
- Emergency QR — cached, works without internet (signed token, no server check needed)
- Write operations — queued in IndexedDB, sync when back online
- Use `useOnlineStatus()` hook to show banner when offline

---

## 5.5 The Emergency QR System (Final Security Implementation)

This is your fifth research contribution. Implement it fully here.

### Schema (add to existing models)

```typescript
// models/EmergencyQR.ts
const EmergencyQRSchema = new Schema({
  patientId: { type: ObjectId, ref: 'Patient', required: true, index: true },
  
  nonce: { type: String, required: true, unique: true, index: true },
  signedPayload: { type: String, required: true },
  qrImageUrl: String,
  
  issuedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  
  status: { type: String, enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], default: 'ACTIVE', index: true },
  
  // Geo-anomaly tracking
  patientLastKnownLocation: {
    lat: Number, lng: Number, 
    capturedAt: Date
  },
  
  // Scan history
  scans: [{
    scannedAt: Date,
    scannerLocation: { lat: Number, lng: Number },
    scannerIp: String,
    geoDistanceKm: Number,
    isAnomaly: Boolean,
    accessedFields: [String]
  }],
  
  revokedAt: Date,
  revokedReason: String,
  revokedBy: { type: String, enum: ['PATIENT', 'SYSTEM_GEO_ANOMALY', 'SYSTEM_EXPIRY'] }
}, { timestamps: true });

EmergencyQRSchema.index({ patientId: 1, status: 1 });
```

### Generation

```typescript
// services/emergency-qr.service.ts
import crypto from 'crypto';
import QRCode from 'qrcode';

const TTL_DAYS = 90;
const HMAC_SECRET = process.env.QR_HMAC_SECRET!;

export async function generateEmergencyQR(patientId: string) {
  const patient = await Patient.findById(patientId);
  
  // 1. Revoke previous active QRs (only one active at a time)
  await EmergencyQR.updateMany(
    { patientId, status: 'ACTIVE' },
    { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'NEW_QR_ISSUED', revokedBy: 'PATIENT' }
  );
  
  // 2. Generate nonce
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // 3. Build payload
  const payload = {
    typ: 'EMERGENCY',
    pid: patient.medvaultId,           // human-readable ID, not Mongo _id
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (TTL_DAYS * 86400),
    nonce,
    ver: 1
  };
  
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payloadB64)
    .digest('base64url');
  
  const signedPayload = `${payloadB64}.${hmac}`;
  const qrUri = `medvault://emergency/${signedPayload}`;
  
  // 4. Generate QR image
  const qrImageDataUrl = await QRCode.toDataURL(qrUri, {
    errorCorrectionLevel: 'H',         // high — survives smudges
    width: 512,
    margin: 2,
    color: { dark: '#138984', light: '#FFFFFF' }
  });
  
  // 5. Save
  const emergencyQR = await EmergencyQR.create({
    patientId,
    nonce,
    signedPayload,
    qrImageUrl: await uploadDataUrlToS3(qrImageDataUrl, `emergency-qr/${patient.medvaultId}.png`),
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + TTL_DAYS * 86400000),
    status: 'ACTIVE'
  });
  
  // 6. Store in patient's active nonces for fast revocation check
  await Patient.updateOne(
    { _id: patientId },
    { $set: { activeEmergencyQrNonces: [nonce] } }
  );
  
  return emergencyQR;
}
```

### Scan & verify

```typescript
async function scanEmergencyQR(signedPayload: string, scannerContext: ScannerContext) {
  // 1. Split and verify HMAC
  const [payloadB64, signature] = signedPayload.split('.');
  if (!payloadB64 || !signature) throw new Error('Malformed QR');
  
  const expectedSig = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payloadB64)
    .digest('base64url');
  
  // Timing-safe comparison
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Invalid signature');
  }
  
  // 2. Parse payload
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  if (payload.typ !== 'EMERGENCY') throw new Error('Wrong QR type');
  if (payload.exp < Date.now() / 1000) throw new Error('QR expired');
  
  // 3. Check nonce hasn't been revoked
  const patient = await Patient.findOne({ medvaultId: payload.pid });
  if (!patient) throw new Error('Patient not found');
  
  if (!patient.activeEmergencyQrNonces?.includes(payload.nonce)) {
    throw new Error('QR has been revoked by patient');
  }
  
  // 4. Geo-anomaly check
  const lastLocation = patient.lastKnownLocation;
  let isAnomaly = false;
  let geoDistanceKm = 0;
  
  if (lastLocation && scannerContext.location) {
    geoDistanceKm = haversineDistance(lastLocation, scannerContext.location);
    const hoursSinceLocation = (Date.now() - lastLocation.capturedAt.getTime()) / 3600000;
    
    // Reasonable travel: ~100km/h max (highway). Flag if exceeds.
    const maxReasonableDistance = hoursSinceLocation * 100;
    isAnomaly = geoDistanceKm > maxReasonableDistance && geoDistanceKm > 200;
  }
  
  if (isAnomaly) {
    // AUTO-REVOKE
    await EmergencyQR.updateOne(
      { nonce: payload.nonce },
      { 
        status: 'REVOKED', 
        revokedAt: new Date(),
        revokedReason: `Geo-anomaly: ${geoDistanceKm}km from last known location`,
        revokedBy: 'SYSTEM_GEO_ANOMALY'
      }
    );
    
    await Patient.updateOne(
      { _id: patient._id },
      { $pull: { activeEmergencyQrNonces: payload.nonce } }
    );
    
    // CRITICAL notification
    await sendWhatsAppCritical(patient.phone,
      `🚨 SUSPICIOUS EMERGENCY QR SCAN BLOCKED\n\n` +
      `Your emergency QR was scanned at a location ${geoDistanceKm}km from your last known location ` +
      `(${scannerContext.location.city}). This looks suspicious so access was blocked.\n\n` +
      `If this was you (you traveled), generate a new QR.\n` +
      `If this was not you, your old QR is no longer valid.`
    );
    
    throw new GeoAnomalyError('Access denied due to geographic anomaly');
  }
  
  // 5. Notify patient of scan (loud notification)
  await sendWhatsApp(patient.phone,
    `🚑 Your emergency QR was just scanned at ${scannerContext.facilityName || 'a healthcare facility'} ` +
    `in ${scannerContext.location?.city}. Emergency data is being shared.\n\n` +
    `If this is wrong, tap to revoke immediately: ${revokeLink(payload.nonce)}`
  );
  
  // 6. Log the scan
  await EmergencyQR.updateOne(
    { nonce: payload.nonce },
    {
      $push: {
        scans: {
          scannedAt: new Date(),
          scannerLocation: scannerContext.location,
          scannerIp: scannerContext.ip,
          geoDistanceKm,
          isAnomaly: false,
          accessedFields: ['allergies', 'chronicConditions', 'activeMedications', 'bloodGroup', 'emergencyContact']
        }
      }
    }
  );
  
  // 7. Audit log
  await AccessLog.create({
    actorUserId: scannerContext.userId,
    actorRole: 'EMERGENCY_RESPONDER',
    action: 'EMERGENCY_QR_SCAN',
    patientId: patient._id,
    ip: scannerContext.ip,
    geoCountry: scannerContext.location?.country,
    geoCity: scannerContext.location?.city,
    metadata: { nonce: payload.nonce, geoDistanceKm }
  });
  
  // 8. Return emergency-only data (heavily filtered)
  return {
    patient: {
      name: patient.fullName,
      age: computeAge(patient.dateOfBirth),
      sex: patient.sex,
      bloodGroup: patient.bloodGroup,
      medvaultId: patient.medvaultId
    },
    critical: {
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions.filter(c => c.status === 'ACTIVE'),
      activeMedications: patient.activeMedications.map(m => ({
        name: m.displayName,
        dose: m.strength
      })),
      emergencyContact: patient.emergencyContact
    },
    accessExpiresIn: 4 * 60 * 60,    // 4 hours of viewing window for the responder
    scanId: 'unique-scan-id'
  };
}
```

### Patient revocation endpoint

```typescript
// routes/emergency-qr.ts
router.post('/emergency-qr/revoke/:nonce', requireRole('PATIENT'), async (req, res) => {
  const { nonce } = req.params;
  const patientId = req.user.patientId;
  
  await EmergencyQR.updateOne(
    { nonce, patientId },
    {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokedReason: 'Patient revoked manually',
      revokedBy: 'PATIENT'
    }
  );
  
  await Patient.updateOne(
    { _id: patientId },
    { $pull: { activeEmergencyQrNonces: nonce } }
  );
  
  res.json({ revoked: true });
});

router.post('/emergency-qr/scan', async (req, res) => {
  // No auth — scanner could be anyone with an iPhone in an ambulance.
  // BUT: scanner identity captured via IP geolocation + facility ID if scanned via app
  const result = await scanEmergencyQR(req.body.signedPayload, {
    ip: req.ip,
    location: req.body.scannerLocation,
    facilityName: req.body.facilityName,
    userId: req.user?.userId
  });
  res.json(result);
});
```

### Background jobs

```typescript
// jobs/qr-expiry-sweep.ts
// Run nightly via cron
async function sweepExpiredQRs() {
  const expired = await EmergencyQR.find({
    status: 'ACTIVE',
    expiresAt: { $lt: new Date() }
  });
  
  for (const qr of expired) {
    await EmergencyQR.updateOne(
      { _id: qr._id },
      { status: 'EXPIRED', revokedBy: 'SYSTEM_EXPIRY' }
    );
    await Patient.updateOne(
      { _id: qr.patientId },
      { $pull: { activeEmergencyQrNonces: qr.nonce } }
    );
  }
  
  // Notify patients to regenerate
  // ...
}
```

---

## 5.6 Frontend Hookup of Auth & API

### API client

```typescript
// lib/api/client.ts
import axios from 'axios';
import { getAccessToken, refreshTokens } from '../auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true
});

api.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshSubscribers.push(token => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      
      original._retry = true;
      isRefreshing = true;
      
      try {
        const newToken = await refreshTokens();
        refreshSubscribers.forEach(cb => cb(newToken));
        refreshSubscribers = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        // Refresh failed — log out
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Auth store

```typescript
// lib/stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, token) => set({ user, accessToken: token }),
      clearAuth: () => set({ user: null, accessToken: null })
    }),
    { name: 'medvault-auth' }
  )
);
```

---

## 5.7 Deployment

### Infrastructure plan

For a final-year project, optimize for cost + demo reliability:

| Service | Where | Notes |
|---|---|---|
| Frontend (Next.js) | Vercel | Free tier handles college-scale demo traffic |
| Backend (Express) | Railway or Render | $5-10/mo; supports BullMQ workers in same env |
| AI Service (FastAPI) | Hugging Face Spaces (free GPU) or Modal | GPU is crucial for Whisper/BERT |
| Blockchain Worker | Railway (same project as backend) | Easier than separate deployment |
| MongoDB | MongoDB Atlas (free M0 tier or paid M2) | M0 has 512MB limit, fine for demo |
| Redis | Upstash | Free tier, serverless Redis |
| S3-compatible | Cloudflare R2 | Free egress, cheap storage |
| Smart contract | Polygon Amoy testnet | Free test MATIC |

### Why this combo

- Vercel: free, fast, great DX for Next.js
- Railway: easy multi-service deployment, free starter credit
- HF Spaces: free GPU (T4) which you need for Whisper inference
- Atlas: managed MongoDB, free tier sufficient for demo data

### Dockerfiles for each service

**Backend:**

```dockerfile
# apps/backend/Dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY apps/backend ./apps/backend
COPY packages ./packages
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN cd apps/backend && pnpm build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

**AI Service:**

```dockerfile
# apps/ai-service/Dockerfile
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04 AS base
RUN apt-get update && apt-get install -y python3.11 python3-pip git

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e .

COPY src ./src
COPY checkpoints ./checkpoints   # trained models bundled (or mount as volume)

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### CI/CD

Use GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install
      - run: pnpm test --filter=backend
  
  test-ai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -e apps/ai-service[test]
      - run: cd apps/ai-service && pytest
  
  deploy-frontend:
    needs: [test-backend]
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
  
  deploy-backend:
    needs: [test-backend]
    runs-on: ubuntu-latest
    steps:
      - run: railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Production env vars checklist

Before going live:

- [ ] All secrets rotated from dev (`JWT_*`, `QR_HMAC_SECRET`, `DATA_ENCRYPTION_KEY`)
- [ ] `USE_ABDM_MOCK=false` (or keep `true` if no sandbox access — be honest in demo)
- [ ] CORS configured for frontend domain only
- [ ] Rate limiting enabled on all auth endpoints
- [ ] Mongo connection string uses TLS
- [ ] Redis uses TLS
- [ ] `NODE_ENV=production`
- [ ] Sentry or Logtail for error tracking
- [ ] Blockchain RPC URL points to Polygon Amoy (or mainnet if budget allows)
- [ ] Twilio credentials for WhatsApp work in production sandbox
- [ ] Storage bucket configured with proper access controls

---

## 5.8 Comprehensive Evaluation Suite

Now run the evaluation for your paper. This is independent code, kept under `apps/ai-service/evaluation/`.

### What to evaluate (5 contributions = 5 evaluations)

1. **Symptom NER + Classifier pipeline**
2. **Whisper LoRA on Indian medical English**
3. **OCR pipeline on handwritten prescriptions**
4. **Verification framework + blockchain anchoring**
5. **Emergency QR security**

### Master evaluation script

```python
# apps/ai-service/evaluation/run_full_evaluation.py
import json
from pathlib import Path

from .ner_eval import evaluate_ner
from .classifier_eval import evaluate_classifier
from .whisper_eval import evaluate_whisper
from .ocr_eval import evaluate_ocr_pipeline
from .security_eval import evaluate_emergency_qr
from .end_to_end_eval import evaluate_full_clinical_pipeline

def main():
    results = {}
    
    print("=" * 60)
    print("MedVault Comprehensive Evaluation")
    print("=" * 60)
    
    print("\n[1/6] Evaluating NER pipeline...")
    results['ner'] = evaluate_ner()
    
    print("\n[2/6] Evaluating Differential Diagnosis Classifier...")
    results['classifier'] = evaluate_classifier()
    
    print("\n[3/6] Evaluating Whisper LoRA...")
    results['whisper'] = evaluate_whisper()
    
    print("\n[4/6] Evaluating OCR Pipeline...")
    results['ocr'] = evaluate_ocr_pipeline()
    
    print("\n[5/6] Evaluating Emergency QR Security...")
    results['security'] = evaluate_emergency_qr()
    
    print("\n[6/6] End-to-end pipeline benchmark...")
    results['end_to_end'] = evaluate_full_clinical_pipeline()
    
    # Save raw results
    out = Path("evaluation_results.json")
    out.write_text(json.dumps(results, indent=2, default=str))
    print(f"\n✓ Results saved to {out}")
    
    # Generate paper tables
    generate_latex_tables(results)
    
    # Summary
    print_summary(results)

if __name__ == "__main__":
    main()
```

### NER evaluation

```python
# evaluation/ner_eval.py
from datasets import load_dataset
from seqeval.metrics import classification_report, f1_score
from src.models.ner_service import extract_entities

def evaluate_ner():
    test_set = load_dataset("json", data_files="data/i2b2/test.json")['train']
    
    all_true_labels = []
    all_pred_labels = []
    
    for example in test_set:
        text = ' '.join(example['tokens'])
        pred_entities = extract_entities(text)
        
        true_labels = [example['tags'][i] for i, _ in enumerate(example['tokens'])]
        pred_labels = align_predictions_to_tokens(pred_entities, example['tokens'])
        
        all_true_labels.append(true_labels)
        all_pred_labels.append(pred_labels)
    
    return {
        "overall_f1": f1_score(all_true_labels, all_pred_labels),
        "per_category": classification_report(all_true_labels, all_pred_labels, output_dict=True),
        "negation_f1": evaluate_negation_separately(test_set),
        "n_examples": len(test_set)
    }
```

### Classifier evaluation (with India subset)

```python
# evaluation/classifier_eval.py
def evaluate_classifier():
    test_data = np.load("data/ddxplus/test.npz")
    X, y = test_data['X'], test_data['y']
    
    model = joblib.load("checkpoints/xgb_ddxplus_calibrated.joblib")
    bert_model = load_bert_classifier()
    
    results = {}
    
    for model_name, model_obj, predict_fn in [
        ("xgboost_baseline", model, model.predict_proba),
        ("bioclinicalbert", bert_model, predict_with_bert)
    ]:
        probs = predict_fn(X)
        
        # Apply India reweighting
        reweighted = np.array([reweight_probabilities_array(p) for p in probs])
        
        results[model_name] = {
            "top_1_accuracy": top_k_accuracy_score(y, probs, k=1),
            "top_3_accuracy": top_k_accuracy_score(y, probs, k=3),
            "top_5_accuracy": top_k_accuracy_score(y, probs, k=5),
            "top_1_after_reweighting": top_k_accuracy_score(y, reweighted, k=1),
            "ece": expected_calibration_error(y, probs, n_bins=10),
            "brier_score": multiclass_brier(y, probs),
            "macro_f1": f1_score(y, probs.argmax(axis=1), average='macro')
        }
        
        # India-prevalent disease subset
        india_diseases = ['Tuberculosis', 'Dengue fever', 'Typhoid fever', 'Malaria']
        india_mask = np.isin(y, [pathology_to_idx[d] for d in india_diseases])
        results[model_name]['india_subset'] = {
            "n": int(india_mask.sum()),
            "top_3_accuracy_before_reweighting": top_k_accuracy_score(y[india_mask], probs[india_mask], k=3),
            "top_3_accuracy_after_reweighting": top_k_accuracy_score(y[india_mask], reweighted[india_mask], k=3)
        }
    
    # Red flag detection eval
    results['red_flags'] = evaluate_red_flag_detector()
    
    return results
```

### Whisper evaluation

```python
# evaluation/whisper_eval.py
from jiwer import wer, cer
from src.models.whisper_service import transcribe as whisper_lora_transcribe
from faster_whisper import WhisperModel

def evaluate_whisper():
    test_clips = json.load(open("data/whisper_clips/test.json"))
    
    baseline_model = WhisperModel("base", device="cuda", compute_type="float16")
    
    baseline_predictions = []
    lora_predictions = []
    references = []
    medical_term_predictions = []
    drug_predictions = []
    
    for clip in test_clips:
        ref = clip['transcription']
        
        # Baseline (no LoRA)
        segs, _ = baseline_model.transcribe(clip['audio_path'])
        baseline_text = ''.join(s.text for s in segs).strip()
        
        # LoRA-tuned
        lora_text = whisper_lora_transcribe(clip['audio_path'])['text']
        
        baseline_predictions.append(baseline_text)
        lora_predictions.append(lora_text)
        references.append(ref)
        
        # Categorize for sub-metrics
        if clip.get('contains_medical_terms'):
            medical_term_predictions.append((ref, lora_text, baseline_text))
        if clip.get('contains_drug_names'):
            drug_predictions.append((ref, lora_text, baseline_text))
    
    return {
        "overall_wer": {
            "baseline": wer(references, baseline_predictions),
            "lora": wer(references, lora_predictions),
            "absolute_improvement": wer(references, baseline_predictions) - wer(references, lora_predictions)
        },
        "overall_cer": {
            "baseline": cer(references, baseline_predictions),
            "lora": cer(references, lora_predictions)
        },
        "medical_term_wer": {
            "baseline": wer([r for r, _, _ in medical_term_predictions], [b for _, _, b in medical_term_predictions]),
            "lora": wer([r for r, _, _ in medical_term_predictions], [l for _, l, _ in medical_term_predictions])
        },
        "drug_name_wer": {
            "baseline": wer([r for r, _, _ in drug_predictions], [b for _, _, b in drug_predictions]),
            "lora": wer([r for r, _, _ in drug_predictions], [l for _, l, _ in drug_predictions])
        },
        "n_clips": len(test_clips),
        "n_speakers": len(set(c['speaker_id'] for c in test_clips))
    }
```

### OCR evaluation

```python
# evaluation/ocr_eval.py
from src.ocr.pipeline import OCRPipeline

async def evaluate_ocr_pipeline():
    test_prescriptions = json.load(open("data/prescriptions/test_set.json"))
    pipeline = OCRPipeline()
    
    # Per-stage metrics
    region_detection_map = []
    drug_name_correct = 0
    strength_correct = 0
    frequency_correct = 0
    full_match = 0
    total_medications = 0
    
    for rx in test_prescriptions:
        result = await pipeline.process_prescription(rx['image_path'])
        
        # Region detection mAP — compute from YOLO directly
        # ... (use the YOLO val script)
        
        # Per-medication accuracy
        truth_meds = rx['ground_truth_medications']
        pred_meds = result['medications']
        
        matched = match_medications(truth_meds, pred_meds)
        
        for truth, pred in matched:
            total_medications += 1
            if truth['drug_name'].lower() == pred['generic_name'].lower():
                drug_name_correct += 1
            if truth['strength'] == pred['strength']:
                strength_correct += 1
            if truth['frequency'] == pred['frequency']:
                frequency_correct += 1
            if all([truth['drug_name'].lower() == pred['generic_name'].lower(),
                    truth['strength'] == pred['strength'],
                    truth['frequency'] == pred['frequency']]):
                full_match += 1
    
    return {
        "n_prescriptions": len(test_prescriptions),
        "n_medications": total_medications,
        "field_accuracy": {
            "drug_name": drug_name_correct / total_medications,
            "strength": strength_correct / total_medications,
            "frequency": frequency_correct / total_medications,
            "full_match": full_match / total_medications
        },
        "region_detection_map50": load_yolo_metrics()['map50'],
        "needs_review_rate": compute_needs_review_rate(test_prescriptions),
        "avg_latency_seconds": measure_avg_latency()
    }
```

### Emergency QR security evaluation

```python
# evaluation/security_eval.py
def evaluate_emergency_qr():
    """Run adversarial tests against the QR security system."""
    
    tests = {
        "tampered_signature_rejected": test_tampered_signature(),
        "expired_qr_rejected": test_expired_qr(),
        "revoked_nonce_rejected": test_revoked_nonce(),
        "geo_anomaly_detected": test_geo_anomaly(),
        "replay_after_revoke_rejected": test_replay_after_revoke(),
        "timing_attack_resistant": test_timing_attack(),
        "concurrent_scan_handled": test_concurrent_scans()
    }
    
    return {
        "tests_passed": sum(1 for v in tests.values() if v),
        "tests_total": len(tests),
        "details": tests,
        "notification_latency_p95": measure_notification_latency(),
        "scan_to_data_latency_p95": measure_scan_latency()
    }

def test_geo_anomaly():
    """Simulate a scan from far away from patient's last location."""
    patient = create_test_patient(last_location={"lat": 28.6, "lng": 77.2, "city": "Delhi"})
    qr = generate_emergency_qr(patient.id)
    
    try:
        # Scan from Mumbai 1 hour after Delhi location
        scan_emergency_qr(qr.signed_payload, scanner_context={
            "location": {"lat": 19.0, "lng": 72.8, "city": "Mumbai"},
            "ip": "203.0.113.1"
        })
        return False    # should have raised
    except GeoAnomalyError:
        return True
```

### Generate paper tables

```python
# evaluation/generate_paper_tables.py
def generate_latex_tables(results):
    out_dir = Path("paper/tables")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Table 1: NER results
    with open(out_dir / "table_ner.tex", "w") as f:
        f.write(format_ner_table(results['ner']))
    
    # Table 2: Classifier comparison
    with open(out_dir / "table_classifier.tex", "w") as f:
        f.write(format_classifier_table(results['classifier']))
    
    # Table 3: Whisper WER
    with open(out_dir / "table_whisper.tex", "w") as f:
        f.write(format_whisper_table(results['whisper']))
    
    # Table 4: OCR pipeline
    with open(out_dir / "table_ocr.tex", "w") as f:
        f.write(format_ocr_table(results['ocr']))
    
    # Table 5: Security
    with open(out_dir / "table_security.tex", "w") as f:
        f.write(format_security_table(results['security']))
```

---

## 5.9 The Paper

After evaluation, you write. Skeleton structure:

```
1. Abstract (150 words)
2. Introduction
   - Indian healthcare context
   - Existing platforms (eka, abdm-only, hackathon-tier projects)
   - Our 5 contributions
3. Related Work
   - Clinical NLP (i2b2, DDXPlus)
   - Indian medical English ASR
   - Handwritten prescription OCR
   - Healthcare blockchain
   - QR-based emergency access
4. System Architecture
   - Overview diagram
   - Trust framework
   - Async event-driven design
5. Clinical Decision Support
   - NER pipeline
   - DDXPlus classifier + India reweighting + calibration
   - Red flag detection
   - Evaluation results
6. Voice Symptom Intake
   - Whisper baseline
   - LoRA fine-tuning data + procedure
   - Indian medical English WER results
7. Region-Aware Hybrid OCR
   - Pipeline architecture
   - YOLO region detector
   - TrOCR + Google Vision routing
   - LLM extraction
   - India brand normalization
   - Evaluation
8. Verification Framework + Blockchain
   - Tiered trust levels
   - Async anchoring architecture
   - Tamper detection
9. Privacy-Preserving Emergency Access
   - Threat model
   - HMAC + nonce + geo-anomaly + patient-as-detector
   - Security evaluation
10. Discussion
    - Limitations
    - Real-world deployment requirements (ABDM empanelment, etc.)
    - Ethical considerations
11. Conclusion
12. References
```

Each contribution gets its own section with its own evaluation table. Paper is targeting ~14-16 pages, IEEE conference format.

---

## 5.10 Final Checklist — Definition of Done for Phase 5

### Frontend
- [ ] All shadcn/ui components themed with medical-Indian color palette
- [ ] Patient app screens: dashboard, prescriptions, records, appointments, emergency QR, profile
- [ ] Doctor app screens: dashboard, patient summary, prescription form (with real-time safety checks), schedule
- [ ] Clinic admin screens: dashboard, doctors, verification, settings
- [ ] Pharmacy screens: scan, history
- [ ] Lab screens: upload
- [ ] Platform admin screens: verification queue, audit log
- [ ] PWA configured, installable on Android
- [ ] Offline read of cached records works
- [ ] All components have skeleton loading states
- [ ] All actions have optimistic UI + toast feedback
- [ ] Trust badges + blockchain badges visible everywhere appropriate

### Emergency QR
- [ ] HMAC-signed payload generation with 90-day TTL
- [ ] Nonce-based revocation via Redis + Patient.activeEmergencyQrNonces
- [ ] Geo-anomaly detection auto-revokes suspicious scans
- [ ] WhatsApp critical notification on every scan
- [ ] Patient revocation works from app and from notification link
- [ ] Heavily filtered emergency data returned (no full record exposure)
- [ ] Scan history per QR with metadata
- [ ] All 7 adversarial tests pass

### Deployment
- [ ] Frontend deployed to Vercel
- [ ] Backend + worker deployed to Railway
- [ ] AI service deployed to HF Spaces or Modal with GPU
- [ ] MongoDB Atlas configured with backups enabled
- [ ] Smart contract deployed and verified on Polygon Amoy
- [ ] All secrets rotated from development
- [ ] Health check endpoints on every service
- [ ] Sentry or similar error monitoring active
- [ ] CI/CD pipeline running on push to main
- [ ] Domain configured (e.g., medvault.app, free `.vercel.app` is fine for demo)

### Evaluation
- [ ] All 5 evaluation scripts run successfully
- [ ] Results saved to JSON
- [ ] LaTeX tables generated
- [ ] Plots generated (calibration curves, confusion matrices, learning curves)
- [ ] End-to-end latency benchmarked
- [ ] Demo video recorded (5 min walkthrough)

### Paper
- [ ] Draft of all 11 sections written
- [ ] All claimed contributions backed by evaluation numbers
- [ ] Limitations honestly stated (ABDM empanelment, NMC manual review, etc.)
- [ ] Diagrams created in TikZ or draw.io
- [ ] References properly cited
- [ ] One pass by you, one pass by Anant or Satvik for fresh eyes

When you can demo end-to-end: patient books appointment via mobile PWA → records symptoms by voice → AI suggests top-3 → doctor opens patient summary with LLM paragraph and recurrence match → writes prescription with all 4 safety checks firing → blockchain hash appears within 30s → patient gets WhatsApp + prescription PDF → pharmacy scans QR → dispenses → patient activates emergency QR → simulates emergency scan from different city → geo-anomaly triggers and access blocked — Phase 5 is done.

---

## What "Done" Looks Like for the Whole Project

By the end of Phase 5, you should have:

1. A working full-stack deployment anyone can try
2. 5 trained ML models (NER, classifier, Whisper, region detector, TrOCR)
3. A deployed smart contract with verifiable on-chain audit trail
4. Five paper-worthy research contributions with evaluation results
5. A 5-minute demo video
6. A 14-16 page IEEE conference paper draft
7. Clean codebase with tests, README, deployment docs

This is well beyond a hackathon project. This is a defensible final-year project that can also be submitted to a conference.

---

## What to Do After Phase 5

If you have time left:

- Submit paper to a target conference (IEEE HEALTHCOM, IEEE BHI, ACM CHIL)
- Apply for student grants (Anthropic, AWS Activate) for production deployment
- Pilot with one real clinic for 2-4 weeks of usage data
- Add patient-uploaded lab OCR (extension of Phase 4 OCR pipeline)
- Add doctor live-dictation Whisper integration (different use case than patient intake)
- Build a mobile native app (React Native) on top of the API
