# Phase 5 — Frontend + Security + Deployment: Changes Required

**Severity:** Heavy rework (along with Phase 2, the biggest)
**Effort estimate:** 3-4 weeks
**Touches:** Delete clinic admin UI + pharmacy UI + emergency QR (entire subsystem), rebuild doctor's patient view, build lab operator portal, build lab picker

---

## TL;DR

Phase 5 had three big areas:
1. **Frontend** for all roles (patient, doctor, clinic admin, lab op, pharmacy op, platform admin) → drop two of those roles' UIs, rebuild doctor's main view, add lab operator portal
2. **Emergency QR system** (Contribution 5) → delete entirely
3. **Deployment + Evaluation** → minor updates

**The good news:** Design system, shadcn/ui setup, color palette, typography, PWA infrastructure, auth flow, API client, deployment infrastructure — all stay. You're rebuilding pages, not the foundation.

---

## Files To Delete

### Frontend
```
apps/frontend/src/app/(clinic)/                      # entire clinic admin section
apps/frontend/src/app/(pharmacy)/                    # entire pharmacy section
apps/frontend/src/app/(patient)/emergency-qr/        # patient emergency QR pages
apps/frontend/src/components/patient/EmergencyQRCard.tsx
apps/frontend/src/components/clinic/                 # clinic admin components
apps/frontend/src/components/pharmacy/               # pharmacy components
```

### Backend (emergency QR — entire subsystem)
```
apps/backend/src/models/EmergencyQR.ts
apps/backend/src/services/emergency-qr.service.ts
apps/backend/src/routes/emergency-qr.routes.ts
apps/backend/src/jobs/qr-expiry-sweep.ts
```

### AI service (no changes — emergency QR didn't touch AI)

### Evaluation
```
apps/ai-service/evaluation/security_eval.py          # whole file — was emergency QR evals
```

## Files To Heavily Modify

```
apps/frontend/src/app/(doctor)/patient/[id]/page.tsx # REBUILD patient summary view
apps/frontend/src/app/(doctor)/dashboard/page.tsx    # update — list visits not appointments
apps/frontend/src/app/(patient)/dashboard/page.tsx   # cleanup — remove emergency QR section
apps/frontend/src/app/(patient)/prescriptions/page.tsx  # remove pharmacy fulfillment status
apps/frontend/src/components/shared/TrustBadge.tsx   # doctor-level only now
apps/ai-service/evaluation/run_full_evaluation.py    # 5 → 4 contributions
```

## Files To Add

```
apps/frontend/src/app/(lab)/                         # entire lab operator section
apps/frontend/src/app/(lab)/dashboard/page.tsx       # operator dashboard
apps/frontend/src/app/(lab)/orders/page.tsx          # orders queue
apps/frontend/src/app/(lab)/orders/[id]/page.tsx     # order detail + upload
apps/frontend/src/app/(lab)/upload-report/page.tsx   # standalone upload flow

apps/frontend/src/app/(admin)/onboarding/            # assisted onboarding forms
apps/frontend/src/app/(admin)/onboarding/doctor/new/page.tsx
apps/frontend/src/app/(admin)/onboarding/lab/new/page.tsx

apps/frontend/src/components/doctor/LabPicker.tsx    # used in prescription/order flow
apps/frontend/src/components/doctor/QuickRegisterPatient.tsx  # patient quick reg modal
apps/frontend/src/components/lab/                    # lab operator components

apps/frontend/src/app/verify/prescription/[id]/page.tsx   # public verification page
apps/frontend/src/app/verify/lab-report/[id]/page.tsx     # public verification page
```

---

## 1. Drop Emergency QR Entirely

This is straightforward deletion across both backend and frontend.

### Backend deletion checklist

- [ ] Delete `models/EmergencyQR.ts`
- [ ] Delete `services/emergency-qr.service.ts` (700+ lines)
- [ ] Delete `routes/emergency-qr.routes.ts`
- [ ] Delete `jobs/qr-expiry-sweep.ts`
- [ ] Remove `Patient.activeEmergencyQrNonces` field from `Patient` schema
- [ ] Remove `Patient.lastKnownLocation` field (was only used for geo-anomaly)
- [ ] Remove emergency QR routes from main router
- [ ] Remove emergency QR cron job from job scheduler
- [ ] Remove `QR_HMAC_SECRET` and `EMERGENCY_QR_TTL_DAYS` from `.env.example` (the verification QR for prescriptions can reuse `QR_HMAC_SECRET` if you keep that pattern)
- [ ] Drop `emergencyqrs` collection from MongoDB

### Frontend deletion checklist

- [ ] Delete `app/(patient)/emergency-qr/` directory
- [ ] Delete `components/patient/EmergencyQRCard.tsx`
- [ ] Remove emergency QR section from patient dashboard
- [ ] Remove emergency QR menu item from patient navigation
- [ ] Remove any references to "emergency" in patient settings

### Paper updates

- Drop the "Privacy-Preserving Emergency Access" section entirely
- Update abstract: "five contributions" → "four contributions"
- Update introduction list of contributions
- Drop Table 5 (security evaluation) and Section 9
- Renumber remaining sections

---

## 2. Drop Clinic Admin UI

### What to delete

```
apps/frontend/src/app/(clinic)/                      # entire route group
├── dashboard/page.tsx
├── doctors/page.tsx
├── verification/page.tsx
└── settings/page.tsx

apps/frontend/src/components/clinic/                 # all components
```

### What to migrate

The "Clinic Settings" page had clinic info — that lives on the doctor's profile now. Migrate any useful UI patterns (logo upload, address picker, hours editor) into the doctor's "Practice Settings" page.

### Navigation cleanup

In the role-based nav menu, remove "Clinic" tab entirely. Doctor's "Practice Settings" replaces clinic admin's settings page.

---

## 3. Drop Pharmacy UI

```
apps/frontend/src/app/(pharmacy)/scan/page.tsx       # delete
apps/frontend/src/app/(pharmacy)/history/page.tsx    # delete
apps/frontend/src/components/pharmacy/                # delete all
```

Public verification page (not auth-gated) replaces this — anyone can scan a prescription QR and see if it's genuine. No pharmacy portal needed.

---

## 4. Rebuild Doctor's Patient Summary View

This is the most important UI rebuild. The old view was tabs with deep history. The new view is **brain-dead simple at a glance**.

### Spec (from earlier conversation)

```
┌─────────────────────────────────────────────────────────────┐
│  Rajesh Kumar, M, 47 yr         MV-2026-A7K3M               │
│  📞 +91-98xxxxxxx               Last visit: 12 Apr 2025      │
│  📍 Noida (your clinic)         Visits with you: 5           │
├─────────────────────────────────────────────────────────────┤
│  ⚠️  CRITICAL — READ FIRST                                   │
│  🚫 ALLERGIES: Penicillin (severe), Sulfa (mild)             │
│  🩺 CHRONIC: T2DM (since 2019), HTN                          │
│  💊 ON: Metformin 500mg BD, Telmisartan 40mg OD              │
├─────────────────────────────────────────────────────────────┤
│  📊 LAST 3 VISITS (your clinic + others)                     │
│  12 Apr 2025  │ You     │ T2DM follow-up. HbA1c=7.4          │
│  8 Mar 2025   │ Dr. Roy │ URI. Azithromycin 5d.              │
│  15 Feb 2025  │ You     │ HTN review. Stable.                │
├─────────────────────────────────────────────────────────────┤
│  🧪 LATEST LABS                                              │
│  HbA1c     7.4%   (12 Apr) ↑ trending up [▁▁▂▃▄▄]            │
│  FBS       142    (12 Apr) ↑ high          [▂▃▃▄▄▄]          │
│  Creatinine 1.0   (12 Apr) ✓ normal        [▃▃▃▃▃▃]          │
├─────────────────────────────────────────────────────────────┤
│  💬 TODAY'S PRE-VISIT (Voice — recorded 10 min ago)          │
│  "3 din se pet mein dard, fever bhi hai, ulti 2 baar"        │
│  AI Differential (suggestions only):                         │
│  1. Acute gastroenteritis  54%                               │
│  2. Viral hepatitis A      18%                               │
│  3. Peptic ulcer disease   12%                               │
├─────────────────────────────────────────────────────────────┤
│  [📝 Write Prescription]  [🧪 Order Tests]  [📂 Full History]│
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```tsx
// app/(doctor)/patient/[id]/page.tsx — REBUILD
export default async function PatientPage({ params }: { params: { id: string } }) {
  // Single API call returns everything for this view
  const data = await fetchPatientQuickView(params.id);
  
  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-3">
      <PatientHeader patient={data.patient} stats={data.stats} />
      
      <CriticalBand 
        allergies={data.patient.allergies}
        chronicConditions={data.patient.chronicConditions}
        activeMedications={data.patient.activeMedications}
      />
      
      <LastVisitsCard visits={data.lastThreeVisits} />
      
      <LatestLabsCard labResults={data.latestLabs} />
      
      {data.todaysPreVisit && (
        <PreVisitAICard preVisit={data.todaysPreVisit} />
      )}
      
      <ActionBar>
        <Button asChild size="lg">
          <Link href={`/prescriptions/new?patientId=${params.id}&visitId=${data.currentVisitId}`}>
            <FileText className="w-5 h-5 mr-2" /> Write Prescription
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/lab-orders/new?patientId=${params.id}&visitId=${data.currentVisitId}`}>
            <TestTube className="w-5 h-5 mr-2" /> Order Tests
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/patient/${params.id}/full-history`}>
            <Archive className="w-5 h-5 mr-2" /> Full History
          </Link>
        </Button>
      </ActionBar>
    </main>
  );
}
```

### CriticalBand component

```tsx
function CriticalBand({ allergies, chronicConditions, activeMedications }) {
  return (
    <Card className="border-l-4 border-l-rose-600 bg-rose-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-rose-900 text-sm font-bold">
          ⚠️ CRITICAL — READ FIRST
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {allergies.length > 0 && (
          <div className="flex gap-2">
            <span className="text-rose-600 font-bold w-24">🚫 ALLERGIES:</span>
            <span>{allergies.map(a => `${a.allergen} (${a.severity.toLowerCase()})`).join(', ')}</span>
          </div>
        )}
        {chronicConditions.length > 0 && (
          <div className="flex gap-2">
            <span className="text-amber-700 font-bold w-24">🩺 CHRONIC:</span>
            <span>{chronicConditions.map(c => `${c.displayName} (since ${c.diagnosedAt.getFullYear()})`).join(', ')}</span>
          </div>
        )}
        {activeMedications.length > 0 && (
          <div className="flex gap-2">
            <span className="text-blue-700 font-bold w-24">💊 ON:</span>
            <span>{activeMedications.map(m => `${m.displayName} ${m.strength || ''}`).join(', ')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### LatestLabsCard with sparklines

```tsx
function LatestLabsCard({ labResults }) {
  // Group by LOINC, take last 6 values for sparkline
  const labTrends = groupLabsByLoinc(labResults);
  
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">🧪 Latest Labs</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 text-sm font-mono">
        {labTrends.slice(0, 6).map(trend => (
          <div key={trend.loincCode} className="grid grid-cols-12 items-center gap-2">
            <span className="col-span-3">{trend.displayName}</span>
            <span className="col-span-2">{trend.latestValue} {trend.unit}</span>
            <span className="col-span-2 text-xs text-muted-foreground">
              ({formatDate(trend.latestDate, 'short')})
            </span>
            <span className="col-span-2">
              <FlagBadge flag={trend.flag} />
            </span>
            <span className="col-span-3">
              <Sparkline values={trend.recentValues} />
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Backend support — new endpoint for the quick view

```typescript
// routes/patient.routes.ts
router.get('/api/patient/:id/quick-view',
  requireRole('DOCTOR'),
  requireActiveConsent,
  async (req, res) => {
    const patientId = req.params.id;
    const doctorId = req.user.doctorId;
    
    const [patient, visits, labReports, currentVisit] = await Promise.all([
      Patient.findById(patientId).lean(),
      Visit.find({ patientId, status: 'COMPLETED' })
        .sort({ startedAt: -1 })
        .limit(3)
        .populate('doctorId', 'fullName')
        .populate('prescriptionId', 'diagnosis medications')
        .lean(),
      LabReport.find({ patientId })
        .sort({ reportDate: -1 })
        .limit(50)               // for trend computation
        .lean(),
      Visit.findOne({ patientId, doctorId, status: { $in: ['CHECKED_IN', 'IN_CONSULTATION'] } })
        .sort({ startedAt: -1 })
        .lean()
    ]);
    
    const visitsWithMe = await Visit.countDocuments({ patientId, doctorId, status: 'COMPLETED' });
    
    res.json({
      patient: {
        _id: patient._id,
        medvaultId: patient.medvaultId,
        fullName: patient.fullName,
        age: computeAge(patient.dateOfBirth),
        sex: patient.sex,
        phone: patient.contact.primaryPhone,
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
        activeMedications: patient.activeMedications
      },
      stats: {
        totalVisits: patient.stats.totalVisits,
        visitsWithMe,
        lastVisitDate: patient.stats.lastVisitAt
      },
      lastThreeVisits: visits.map(v => ({
        date: v.startedAt,
        doctorName: v.doctorId.fullName,
        isMyVisit: v.doctorId._id.toString() === doctorId,
        primaryDiagnosis: v.prescriptionId?.diagnosis?.[0]?.displayName,
        medicationsCount: v.prescriptionId?.medications?.length || 0
      })),
      latestLabs: extractLabTrends(labReports),     // helper from Phase 2
      todaysPreVisit: currentVisit?.preVisitSymptoms ? {
        rawText: currentVisit.preVisitSymptoms.rawText,
        recordedAt: currentVisit.preVisitSymptoms.recordedAt,
        aiTop3Diagnoses: currentVisit.preVisitSymptoms.aiTop3Diagnoses,
        redFlags: currentVisit.preVisitSymptoms.redFlags
      } : null,
      currentVisitId: currentVisit?._id
    });
  }
);
```

The "Full History" page stays — that's where the old tabbed deep view lives. It just stops being the default.

---

## 5. Build Lab Operator Portal

Net new UI. Three screens:

### 5.1 Dashboard

```tsx
// app/(lab)/dashboard/page.tsx
export default function LabDashboard() {
  const { data: stats } = useQuery({ queryKey: ['lab-stats'], queryFn: fetchLabStats });
  
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">{labName}</h1>
      
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Today's Orders" value={stats?.todayOrders} />
        <StatCard label="Pending Reports" value={stats?.pendingReports} />
        <StatCard label="Completed Today" value={stats?.completedToday} />
        <StatCard label="Avg TAT" value={`${stats?.avgTat}h`} />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderQueueTable orders={stats?.recentOrders} />
        </CardContent>
      </Card>
    </main>
  );
}
```

### 5.2 Orders Queue

```tsx
// app/(lab)/orders/page.tsx
export default function OrdersQueue() {
  const [statusFilter, setStatusFilter] = useState<string>('PATIENT_NOTIFIED');
  const { data: orders } = useQuery({
    queryKey: ['lab-orders', statusFilter],
    queryFn: () => fetchLabOrders({ status: statusFilter })
  });
  
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="PATIENT_NOTIFIED">New</TabsTrigger>
            <TabsTrigger value="ACKNOWLEDGED_BY_LAB">Acknowledged</TabsTrigger>
            <TabsTrigger value="SAMPLE_COLLECTED">Collected</TabsTrigger>
            <TabsTrigger value="IN_PROCESSING">Processing</TabsTrigger>
            <TabsTrigger value="REPORT_UPLOADED">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="space-y-2">
        {orders?.map(order => <OrderCard key={order._id} order={order} />)}
      </div>
    </main>
  );
}

function OrderCard({ order }) {
  return (
    <Card>
      <CardContent className="flex justify-between items-center p-4">
        <div>
          <p className="font-medium">{order.patientId.fullName}, {order.patientId.age}</p>
          <p className="text-sm text-muted-foreground">
            From Dr. {order.doctorId.fullName} • {timeAgo(order.createdAt)}
          </p>
          <p className="text-sm">{order.tests.map(t => t.displayName).join(', ')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/lab/orders/${order._id}`}>Open</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.3 Order Detail + Upload Report

```tsx
// app/(lab)/orders/[id]/page.tsx
export default function OrderDetail({ params }) {
  const { data: order } = useQuery({ /* ... */ });
  const [uploadMethod, setUploadMethod] = useState<'STRUCTURED' | 'PDF_UPLOAD_WITH_OCR' | 'CSV_UPLOAD'>('STRUCTURED');
  
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <OrderHeader order={order} />
      
      <StatusFlow currentStatus={order?.status} onTransition={updateStatus} />
      
      <Card>
        <CardHeader>
          <CardTitle>Upload Report</CardTitle>
          <Tabs value={uploadMethod} onValueChange={setUploadMethod}>
            <TabsList>
              <TabsTrigger value="STRUCTURED">Type Values</TabsTrigger>
              <TabsTrigger value="PDF_UPLOAD_WITH_OCR">Upload PDF</TabsTrigger>
              <TabsTrigger value="CSV_UPLOAD">Upload CSV</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {uploadMethod === 'STRUCTURED' && <StructuredEntryForm tests={order?.tests} />}
          {uploadMethod === 'PDF_UPLOAD_WITH_OCR' && <PDFUploadForm orderId={order?._id} />}
          {uploadMethod === 'CSV_UPLOAD' && <CSVUploadForm />}
        </CardContent>
      </Card>
    </main>
  );
}
```

### Structured entry form for each test

```tsx
function StructuredEntryForm({ tests }) {
  const form = useForm({
    defaultValues: {
      collectionDate: new Date(),
      results: tests.map(t => ({
        loincCode: t.loincCode,
        testName: t.displayName,
        value: '',
        unit: '',
        referenceRange: { low: '', high: '' },
        method: '',
        comments: ''
      }))
    }
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitReport)} className="space-y-4">
        <FormField name="collectionDate" /* ... */ />
        
        {form.watch('results').map((result, idx) => (
          <Card key={idx} className="p-4">
            <p className="font-medium mb-2">{result.testName}</p>
            <div className="grid grid-cols-12 gap-2">
              <FormField name={`results.${idx}.value`} className="col-span-3" placeholder="Value" />
              <FormField name={`results.${idx}.unit`} className="col-span-2" placeholder="Unit" />
              <FormField name={`results.${idx}.referenceRange.low`} className="col-span-2" placeholder="Ref low" />
              <FormField name={`results.${idx}.referenceRange.high`} className="col-span-2" placeholder="Ref high" />
              <FormField name={`results.${idx}.method`} className="col-span-3" placeholder="Method (optional)" />
            </div>
          </Card>
        ))}
        
        <Button type="submit">Send Report</Button>
      </form>
    </Form>
  );
}
```

---

## 6. Build LabPicker Component

Used in Phase 2's "Order Tests" flow.

```tsx
// components/doctor/LabPicker.tsx
interface LabPickerProps {
  loincCodes: string[];                       // tests being ordered
  city: string;                                // doctor's city
  onSelect: (labId: string) => void;
  onSkip: () => void;                          // patient chooses own lab
}

export function LabPicker({ loincCodes, city, onSelect, onSkip }: LabPickerProps) {
  const [openNow, setOpenNow] = useState(true);
  
  const { data: labs } = useQuery({
    queryKey: ['labs', { city, loincCodes, openNow }],
    queryFn: () => discoverLabs({ city, loincCodes, openNow })
  });
  
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose Lab for Patient</DialogTitle>
          <DialogDescription>
            Showing labs in {city} {openNow && '— currently open'}
            <Switch checked={openNow} onCheckedChange={setOpenNow} className="ml-2" />
          </DialogDescription>
        </DialogHeader>
        
        {labs?.find(l => l.isFavoriteOfDoctor) && (
          <>
            <h3 className="text-sm font-semibold text-muted-foreground">⭐ FAVORITES</h3>
            {labs.filter(l => l.isFavoriteOfDoctor).map(lab => (
              <LabCard key={lab.labId} lab={lab} onSelect={onSelect} />
            ))}
          </>
        )}
        
        <h3 className="text-sm font-semibold text-muted-foreground mt-4">OTHER LABS</h3>
        {labs?.filter(l => !l.isFavoriteOfDoctor).map(lab => (
          <LabCard key={lab.labId} lab={lab} onSelect={onSelect} />
        ))}
        
        <DialogFooter>
          <Button variant="ghost" onClick={onSkip}>
            Skip — let patient choose
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LabCard({ lab, onSelect }) {
  return (
    <Card className="p-4 hover:bg-accent cursor-pointer" onClick={() => onSelect(lab.labId)}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{lab.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {lab.address.city} • {lab.distance ? `${lab.distance.toFixed(1)} km` : ''}
            {lab.currentStatus.isOpen ? 
              <span className="ml-2 text-green-600">Open till {lab.currentStatus.closesAt}</span> :
              <span className="ml-2 text-rose-600">Closed</span>
            }
          </p>
          <div className="flex gap-1 mt-1">
            {lab.trustSignals.nablAccredited && <Badge variant="outline">NABL</Badge>}
            {lab.homeCollection.available && <Badge variant="outline">Home collection ₹{lab.homeCollection.charge}</Badge>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono font-semibold">₹{lab.pricing.totalEstimatedPrice}</p>
          <p className="text-xs text-muted-foreground">TAT: {lab.turnaroundTime.maxHours}h</p>
        </div>
      </div>
    </Card>
  );
}
```

---

## 7. Assisted Onboarding UI

Platform admin section gets new pages:

```tsx
// app/(admin)/onboarding/doctor/new/page.tsx
export default function NewDoctorForm() {
  const form = useForm<DoctorOnboardingInput>({
    resolver: zodResolver(doctorOnboardingSchema)
  });
  
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Onboard New Doctor</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submitDoctor)} className="space-y-6">
          <Section title="Basics">
            <FormField name="fullName" label="Full Name" required />
            <FormField name="phoneNumber" label="WhatsApp Phone" required />
            <FormField name="email" label="Email" required />
            <FileUpload name="photoUrl" label="Photo" accept="image/*" />
          </Section>
          
          <Section title="Credentials">
            <FormField name="nmcRegNumber" label="NMC Reg Number" required />
            <SelectField name="stateMedicalCouncil" options={STATE_COUNCILS} />
            <FileUpload name="nmcCertificateUrl" label="NMC Certificate" accept="application/pdf,image/*" required />
            <MultiSelectField name="specializations" label="Specializations" options={SPECIALIZATIONS} />
            <ArrayField name="qualifications" fields={['degree', 'institution', 'year']} />
            <MultiSelectField name="languages" label="Languages Spoken" options={LANGUAGES} />
            <FormField name="yearsExperience" type="number" />
          </Section>
          
          <Section title="Practice">
            <FormField name="practice.displayName" label="Clinic Name" required />
            <AddressInput name="practice.address" required />
            <FormField name="practice.phone" label="Clinic Phone" />
            <HoursEditor name="practice.operatingHours" />
            <FormField name="practice.consultationFee" type="number" prefix="₹" />
            <FileUpload name="practice.logoUrl" label="Clinic Logo" accept="image/*" />
            <FileUpload name="practice.signatureUrl" label="Digital Signature" accept="image/*" />
          </Section>
          
          <Section title="Hospital Affiliations (optional)">
            <ArrayField name="hospitalAffiliations" placeholder="e.g., Apollo Indraprastha — Visiting Consultant" />
          </Section>
          
          <Button type="submit" size="lg">Submit for Review</Button>
        </form>
      </Form>
    </main>
  );
}
```

Similar for lab onboarding.

### QuickRegisterPatient modal

Used by doctor or staff during patient walk-in:

```tsx
// components/doctor/QuickRegisterPatient.tsx
export function QuickRegisterPatientModal({ onComplete }) {
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  
  const initiateMutation = useMutation({
    mutationFn: () => initiatePatientRegistration({ phoneNumber }),
    onSuccess: () => setStep('otp')
  });
  
  const completeMutation = useMutation({
    mutationFn: (profile) => completePatientRegistration({ phoneNumber, otp, ...profile }),
    onSuccess: (patient) => onComplete(patient)
  });
  
  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register New Patient</DialogTitle>
        </DialogHeader>
        
        {step === 'phone' && (
          <>
            <FormField label="Patient WhatsApp Phone" value={phoneNumber} onChange={setPhoneNumber} />
            <Button onClick={() => initiateMutation.mutate()}>Send OTP</Button>
          </>
        )}
        
        {step === 'otp' && (
          <>
            <p className="text-sm">OTP sent to {phoneNumber}. Ask patient to read it aloud.</p>
            <FormField label="OTP" value={otp} onChange={setOtp} />
            <Button onClick={() => setStep('profile')}>Verify</Button>
          </>
        )}
        
        {step === 'profile' && (
          <ProfileForm onSubmit={(profile) => completeMutation.mutate(profile)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 8. Public Verification Pages (NEW)

These are unauthenticated pages. Anyone with the QR can scan and see verification status.

```tsx
// app/verify/prescription/[id]/page.tsx
export default async function VerifyPrescription({ params }) {
  const verification = await fetchPublicPrescriptionVerification(params.id);
  
  return (
    <main className="max-w-2xl mx-auto p-6">
      {verification.valid ? (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600 w-8 h-8" />
              <div>
                <CardTitle>Verified Prescription</CardTitle>
                <CardDescription>{verification.prescriptionNumber}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Issued by</p>
              <p className="font-medium">
                {verification.doctor.name}
                {verification.doctor.verified && <ShieldCheck className="inline w-4 h-4 ml-1 text-emerald-600" />}
              </p>
              <p className="text-xs">NMC: {verification.doctor.nmcRegNumber}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">For</p>
              <p>{verification.patientNameAndAge}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Medications</p>
              {verification.medications.map((m, i) => (
                <p key={i} className="font-mono text-sm">
                  {m.drug} {m.strength} — {m.dosage}
                </p>
              ))}
            </div>
            
            {verification.blockchain.anchored && (
              <a 
                href={`https://amoy.polygonscan.com/tx/${verification.blockchain.txHash}`}
                target="_blank"
                className="text-xs text-violet-600 underline"
              >
                View blockchain proof →
              </a>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-rose-200 bg-rose-50/30">
          <CardHeader>
            <CardTitle className="text-rose-700">
              <AlertCircle className="inline w-6 h-6 mr-2" />
              Verification Failed
            </CardTitle>
            <CardDescription>{verification.reason}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}
```

Similar page for lab reports at `/verify/lab-report/[id]`.

---

## 9. Evaluation Suite Updates

### Remove

```python
# DELETE from run_full_evaluation.py:
results['security'] = evaluate_emergency_qr()       # gone
```

### Update count

```python
print("MedVault Comprehensive Evaluation")
# 6 → 5 sections (4 contributions + end-to-end)

print("\n[1/5] Evaluating NER pipeline...")
print("\n[2/5] Evaluating Differential Diagnosis Classifier...")
print("\n[3/5] Evaluating Whisper LoRA...")
print("\n[4/5] Evaluating OCR Pipeline...")           # now includes BOTH Rx and lab report OCR
print("\n[5/5] End-to-end pipeline benchmark...")
```

### Add lab report OCR evaluation

```python
# evaluation/ocr_eval.py — extend
async def evaluate_ocr_pipeline():
    return {
        "prescriptions": await evaluate_prescription_ocr(),    # existing
        "lab_reports": await evaluate_lab_report_ocr()         # NEW
    }

async def evaluate_lab_report_ocr():
    test_set = json.load(open("data/lab_reports/test_set.json"))
    # Compare extracted LOINC codes + values against ground truth
    # ...
    return {
        "test_recognition_accuracy": tp / total,
        "value_extraction_accuracy": correct_values / total_values,
        "loinc_normalization_accuracy": ...,
        "reference_range_extraction_accuracy": ...
    }
```

---

## 10. Paper Updates

Section-by-section:

- **Abstract:** "Five contributions" → "Four contributions"
- **§1 Introduction:** Drop emergency access from contribution list
- **§2 Related Work:** Drop the QR-based emergency access subsection
- **§3 System Architecture:** Update diagram (no emergency QR boxes), add lab marketplace
- **§4 Clinical Decision Support:** Mostly unchanged
- **§5 Voice Symptom Intake:** Unchanged
- **§6 Region-Aware Hybrid OCR:** STRENGTHEN — now covers both prescriptions and lab reports, more samples, broader use case
- **§7 Verification Framework + Blockchain:** Add LabReport hashing if you decided to extend in Phase 4
- **§8 (was Emergency Access):** DELETE entire section
- **§9 (now §8) Discussion:** New angle — "Deployed pilot with N doctors, M patients over X weeks"
- **§10 (now §9) Conclusion:** Update count, mention deployment outcomes

Tables to drop:
- Table 5: Emergency QR security evaluation → delete

Tables to add:
- Table on lab report OCR evaluation (extend OCR table)
- Table on real-usage metrics from pilot (visits, prescriptions, lab orders, safety check trigger rates, etc.)

---

## 11. Updated Definition of Done — Phase 5 v2

- [ ] All emergency QR backend code deleted (services, routes, schemas, jobs, env vars)
- [ ] All emergency QR frontend pages deleted
- [ ] Clinic admin pages + components deleted
- [ ] Pharmacy pages + components deleted
- [ ] Doctor's patient summary view rebuilt — single scroll, decision-grade information at a glance
- [ ] Lab operator portal built: dashboard, orders queue, order detail, three upload methods
- [ ] LabPicker component built and integrated into Order Tests flow
- [ ] Assisted onboarding forms (doctor + lab) work end-to-end
- [ ] QuickRegisterPatient modal works during walk-in
- [ ] Public verification pages live for prescriptions and lab reports
- [ ] All trust badges updated (doctor-level only, not clinic-level)
- [ ] Patient app updated to remove emergency QR section
- [ ] Patient app updated to remove pharmacy fulfillment status
- [ ] Patient app shows lab orders (with status tracking, alternate lab option)
- [ ] Navigation cleaned up — no dead routes or menu items
- [ ] Mobile responsive on cheap Android phones (test on 360px width, slow 3G simulation)
- [ ] Hindi labels on critical patient-facing strings (consent prompt, OTP message, prescription view)
- [ ] All evaluation scripts run (4 contributions, no emergency QR)
- [ ] Paper draft updated to 4 contributions, deployment-focused narrative

When you can demo: walk into pilot doctor's clinic → receptionist opens MedVault → quick-registers you in 60 seconds → you're sitting in waiting room, record symptoms in Hindi-English → walk in to doctor → doctor scans your QR → sees clean summary with all critical info up top → writes prescription with safety checks → orders 3 tests → lab picker shows partner labs in city open now → selects Sharma Pathology → you get WhatsApp with PDF + lab map → walk to lab → operator marks you arrived → samples collected → 4 hours later report on your phone → next visit doctor sees trended lab values — **MedVault v2 is done.**

---

## What Doesn't Change

- shadcn/ui setup and theming
- Color palette (medical teal + Indian amber)
- Typography (Inter + Devanagari)
- TrustBadge / BlockchainBadge components (minor: badges are doctor-level only)
- PWA + offline strategy
- Auth flow (login, refresh, store)
- API client + axios interceptor
- Deployment infrastructure (Vercel/Railway/HF Spaces/Atlas/R2)
- CI/CD pipelines
- Sentry / monitoring setup
