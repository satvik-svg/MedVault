# Phase 4 — OCR + Blockchain: Changes Required

**Severity:** Minimal — almost nothing changes
**Effort estimate:** 3-5 days, mostly to extend OCR for lab reports + decide on hashing scope
**Touches:** OCR pipeline gets a new input type (lab reports), blockchain optionally extends to lab reports

---

## TL;DR

Phase 4 is the second safest phase. The OCR pipeline and blockchain layer are both unchanged structurally — same models, same smart contract, same BullMQ architecture.

**Two small additions:**
1. **OCR pipeline gets a lab-report variant** — for when labs upload PDFs and for when patients photograph lab reports from non-partner labs
2. **Blockchain hashing optionally extends to LabReport** — currently anchors prescriptions only; recommend adding LabReport for stronger tamper-detection coverage

The smart contract itself does **not** need to be redeployed if you designed it to accept any record type (which we did — `RecordType` enum already includes LAB_REPORT).

---

## Files To NOT Touch

```
apps/ai-service/src/ocr/preprocessor.py          # unchanged
apps/ai-service/src/ocr/region_detector.py       # unchanged
apps/ai-service/src/ocr/ocr_engines.py           # unchanged
apps/ai-service/src/ocr/normalizer.py            # unchanged
apps/ai-service/src/ocr/confidence_aggregator.py # unchanged

apps/blockchain-contracts/contracts/             # smart contract unchanged
apps/blockchain-worker/src/workers/anchor-prescription.worker.ts  # works as is
```

## Files To Add / Lightly Modify

```
apps/ai-service/src/ocr/lab_report_pipeline.py      # NEW — variant pipeline for lab reports
apps/ai-service/src/ocr/lab_llm_extractor.py        # NEW — different LLM prompt for lab reports
apps/ai-service/src/api/routes/ocr.py                # ADD endpoint for lab reports
apps/blockchain-worker/src/workers/anchor-lab-report.worker.ts  # NEW (if extending hashing)
apps/backend/src/services/blockchain.queue.ts        # ADD enqueueLabReportAnchor()
```

---

## 1. OCR Pipeline — Add Lab Report Variant

The existing prescription OCR pipeline handles handwritten prescriptions. Lab reports are different:

- Usually **printed** (not handwritten) — Google Vision performs well
- Have a **structured layout** (test name + value + unit + reference range columns)
- Need **LOINC code mapping** instead of RxNorm
- Have **reference ranges** to interpret

So while we reuse all the infrastructure, the pipeline composition is slightly different:

```python
# src/ocr/lab_report_pipeline.py
class LabReportOCRPipeline:
    def __init__(self):
        self.normalizer = LoincNormalizer()      # new — maps test names to LOINC
    
    async def process_lab_report(self, image_path: str) -> dict:
        # 1. Preprocess (reuse existing)
        processed = preprocess(image_path)
        image = processed['shadow_removed']
        
        # 2. Region detection (use a different YOLO model OR skip for lab reports)
        # Lab reports often don't need region detection — they're tabular
        # Just OCR the whole page with Google Vision
        
        # 3. OCR (Google Vision — labs are mostly printed)
        ocr_result = ocr_printed(image_to_bytes(processed['original']))
        
        # 4. LLM semantic extraction with lab-specific prompt
        extracted = lab_llm_extractor.extract_lab_results(ocr_result['text'])
        
        # 5. Normalize test names to LOINC
        for result in extracted.get('results', []):
            normalized = await self.normalizer.normalize(result['test_name'])
            result['loinc_code'] = normalized['loinc_code']
            result['standard_name'] = normalized['standard_name']
        
        # 6. Parse values + reference ranges + detect abnormalities
        for result in extracted.get('results', []):
            result['flag'] = compute_flag(result['value'], result['reference_range'])
        
        return {
            "lab_name": extracted.get('lab_name'),
            "report_date": extracted.get('report_date'),
            "patient_info": extracted.get('patient_info'),
            "results": extracted.get('results', []),
            "raw_ocr": ocr_result
        }
```

### LLM prompt for lab reports

```python
# src/ocr/lab_llm_extractor.py
LAB_EXTRACTION_PROMPT = """You are a medical lab report parser specialized in Indian diagnostic reports.

Common Indian lab report formats include:
- Dr. Lal Pathlabs, SRL, Thyrocare, Metropolis layouts
- Local lab handwritten or basic printed reports

For each test result in the report, extract:
- test_name: as printed (e.g., "Haemoglobin", "Fasting Blood Sugar", "HbA1c")
- value: the numeric or qualitative value
- unit: e.g., "g/dL", "mg/dL", "%", "x10^9/L"
- reference_range: { "low": X, "high": Y } or string like "Normal: <100"
- method: if printed (e.g., "HPLC", "Auto Analyzer")
- comments: any notes from the lab

Also extract:
- lab_name: the lab that issued the report
- report_date
- collection_date
- patient_info: { name, age, sex } (if visible)

Output JSON only, no prose. If you cannot parse a value, set confidence < 0.5."""

def extract_lab_results(ocr_text: str) -> dict:
    response = anthropic_client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=3000,
        system=LAB_EXTRACTION_PROMPT,
        messages=[{"role": "user", "content": f"Lab report OCR:\n\n{ocr_text}\n\nExtract as JSON."}]
    )
    return parse_json_strict(response.content[0].text)
```

### LOINC normalizer

Similar to the RxNorm normalizer in Phase 4 v1, but for tests:

```python
# src/ocr/loinc_normalizer.py
class LoincNormalizer:
    def __init__(self):
        self.loinc_lookup = load_loinc_with_aliases()    # from MongoDB ref data
        # Common Indian aliases (e.g., "FBS" → "Fasting Blood Sugar" → LOINC 1558-6)
    
    async def normalize(self, test_name: str) -> dict:
        # Fuzzy match against LOINC + Indian aliases
        match = process.extractOne(test_name, self.loinc_lookup.keys(), score_cutoff=80)
        if not match:
            return { "loinc_code": None, "standard_name": test_name, "match_confidence": 0 }
        return {
            "loinc_code": self.loinc_lookup[match[0]]['code'],
            "standard_name": self.loinc_lookup[match[0]]['standard_name'],
            "match_confidence": match[1] / 100
        }
```

### Endpoint

```python
# Add to src/api/routes/ocr.py
@router.post("/ocr/lab-report")
async def ocr_lab_report(image: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        content = await image.read()
        tmp.write(content)
        tmp.flush()
        result = await lab_report_pipeline.process_lab_report(tmp.name)
    return result
```

### Where it gets called

Two places:
1. **Lab operator portal:** lab uploads PDF, OCR processes it → structured results filled in for operator to verify before sending. (See Phase 2 changes — lab upload-report endpoint.)
2. **Patient app:** patient photographs external lab report (from non-partner lab) → OCR digitizes → saves to their record as `EXTERNAL_OCR`.

The same endpoint, two callers.

---

## 2. Blockchain — Extend Hashing to Lab Reports (Optional, Recommended)

The smart contract you already deployed has `RecordType` enum:

```solidity
enum RecordType { PRESCRIPTION, LAB_REPORT, PRESCRIPTION_FULFILLMENT, CONSENT }
```

Lab report support is already there — you just haven't wired it up.

### Why extend

- Lab reports are also issuer-signed medical records
- Tamper detection on lab reports is valuable (someone could modify Hb value in MongoDB and you wouldn't catch it)
- Strengthens the "all our doctor-issued records are anchored" story for your paper

### Why NOT extend (cost concern)

- Each on-chain transaction costs gas (even on Polygon Amoy testnet, you'll run out of test MATIC if volume is high)
- Lab reports are higher volume than prescriptions (one Rx → multiple labs)

### Recommendation

**Anchor lab reports too — but only those from MEDVAULT_NATIVE_LAB_PARTNER sources.** Don't anchor `EXTERNAL_OCR` lab reports (those are patient uploads, not lab-issued, so the trust chain is broken anyway).

### Implementation

```typescript
// apps/blockchain-worker/src/workers/anchor-lab-report.worker.ts — NEW
export async function anchorLabReport(job: Job) {
  const { labReportId } = job.data;
  
  const labReport = await db.collection('labreports').findOne({ _id: labReportId });
  if (!labReport) throw new Error('Lab report not found');
  
  // Skip external uploads — not lab-issued
  if (labReport.source !== 'MEDVAULT_NATIVE_LAB_PARTNER') {
    console.log(`Skipping lab report ${labReportId} — not lab partner issued`);
    return { skipped: true };
  }
  
  // Canonical hash
  const canonical = canonicalizeLabReportForHashing(labReport);
  const contentHash = '0x' + sha256(canonical);
  
  const patientIdHash = '0x' + sha256(labReport.patientId.toString() + process.env.HASH_SALT);
  const issuerIdHash = '0x' + sha256(labReport.labId.toString() + process.env.HASH_SALT);
  const recordIdHash = '0x' + sha256(labReport._id.toString());
  
  await db.collection('labreports').updateOne(
    { _id: labReportId },
    { 'blockchain.status': 'PENDING', 'blockchain.contentHash': contentHash }
  );
  
  try {
    const tx = await contract.anchorRecord(
      recordIdHash,
      contentHash,
      1,                                // LAB_REPORT enum value (vs 0 = PRESCRIPTION)
      patientIdHash,
      issuerIdHash
    );
    const receipt = await tx.wait();
    
    await db.collection('labreports').updateOne(
      { _id: labReportId },
      {
        'blockchain.status': 'ANCHORED',
        'blockchain.txHash': receipt.hash,
        'blockchain.blockNumber': receipt.blockNumber,
        'blockchain.anchoredAt': new Date()
      }
    );
    
    return { txHash: receipt.hash };
  } catch (error) {
    throw error;       // BullMQ retry
  }
}
```

### Canonical hash for lab report

```typescript
// shared/canonicalize.ts — ADD function
export function canonicalizeLabReportForHashing(labReport: LabReport): string {
  const canonical = {
    reportNumber: labReport.reportNumber,
    patientId: labReport.patientId.toString(),
    labId: labReport.labId.toString(),
    orderedByDoctorId: labReport.orderedByDoctorId?.toString() || null,
    collectionDate: labReport.collectionDate?.toISOString() || null,
    reportDate: labReport.reportDate.toISOString(),
    results: labReport.results.map(r => ({
      loinc: r.loincCode,
      value: String(r.value),
      unit: r.unit
    })).sort((a, b) => a.loinc.localeCompare(b.loinc))
  };
  return JSON.stringify(canonical);
}
```

### Enqueue on lab report creation

In Phase 2's lab order service:

```typescript
// services/lab-order.service.ts — in upload-report logic
// After labReport.create() succeeds:
if (labReport.source === 'MEDVAULT_NATIVE_LAB_PARTNER') {
  await blockchainQueue.add(
    'anchor-lab-report',
    { labReportId: labReport._id },
    { jobId: `lr-${labReport._id}` }
  );
}
```

### Worker entry point — register new handler

```typescript
// apps/blockchain-worker/src/index.ts
import { anchorLabReport } from './workers/anchor-lab-report.worker';

const worker = new Worker('blockchain-audit', async (job) => {
  switch (job.name) {
    case 'anchor-prescription':
      return await anchorPrescription(job);
    case 'anchor-lab-report':                   // NEW
      return await anchorLabReport(job);
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}, { /* ... */ });
```

---

## 3. Verification Endpoint — Extend for Lab Reports

```typescript
// routes/verification.routes.ts — add
router.get('/api/lab-reports/:id/verify', async (req, res) => {
  const labReport = await LabReport.findById(req.params.id);
  
  if (labReport.blockchain?.status !== 'ANCHORED') {
    return res.json({ verified: false, reason: 'Not anchored' });
  }
  
  const canonical = canonicalizeLabReportForHashing(labReport);
  const currentHash = '0x' + sha256(canonical);
  
  const recordIdHash = '0x' + sha256(labReport._id.toString());
  const [valid, anchoredAt] = await contractClient.verifyRecord(recordIdHash, currentHash);
  
  res.json({
    verified: valid,
    anchoredAt: new Date(Number(anchoredAt) * 1000),
    contentHash: currentHash,
    onChainHash: labReport.blockchain.contentHash,
    txHash: labReport.blockchain.txHash,
    blockNumber: labReport.blockchain.blockNumber,
    explorerUrl: `https://amoy.polygonscan.com/tx/${labReport.blockchain.txHash}`,
    tampered: !valid && labReport.blockchain.contentHash !== currentHash
  });
});
```

---

## 4. Updated Definition of Done — Phase 4 v2

- [ ] OCR pipeline for handwritten prescriptions unchanged and working
- [ ] OCR pipeline for lab reports (new variant) working
- [ ] Lab report OCR returns structured results with LOINC codes
- [ ] LOINC normalizer with Indian aliases (FBS, PPBS, etc.) working
- [ ] `/api/ai/ocr/lab-report` endpoint live
- [ ] Lab operator portal "Upload PDF" path uses lab report OCR
- [ ] Patient "Upload external lab" path uses lab report OCR
- [ ] PrescriptionAudit smart contract unchanged (LAB_REPORT enum already supported)
- [ ] BullMQ worker has new `anchor-lab-report` handler
- [ ] Canonical hashing function for LabReport defined
- [ ] Lab report creation (partner labs only) enqueues blockchain anchor job
- [ ] Lab report verification endpoint live
- [ ] BlockchainBadge component shows correct status for lab reports too
- [ ] Tamper detection works on lab reports (verify, then modify a value in Mongo, verify again → tampered=true)

When you can demo: lab operator uploads PDF → OCR extracts structured results → operator verifies → saves → blockchain anchor job queued → 30s later txHash appears → verify endpoint returns valid → manually edit a Hb value in MongoDB shell → verify endpoint returns `tampered: true` — Phase 4 v2 is done.

---

## What You Don't Need To Retrain

All OCR models from Phase 4 v1 are reused as-is:
- YOLO region detector (for prescriptions — labs don't need it)
- TrOCR fine-tuned (for handwritten text — labs are usually printed, so less critical here)
- Google Cloud Vision is fine for printed lab reports

---

## A Side Note On Gas Costs

If your pilot generates 20 prescriptions/day + 30 lab reports/day = 50 transactions/day = ~1500/month.

On **Polygon Amoy testnet**: free. You'll need a test MATIC faucet refill periodically but no real cost.

On **Polygon mainnet** at current gas prices: ~$0.001-0.002 per transaction. ~$2-3/month. Negligible.

On **Sepolia testnet (Ethereum)**: free but slow (~12s block time vs Polygon's 2s). Polygon is the right choice.

No business model concern at pilot scale. Don't worry about this until you're at thousands of transactions per day.
