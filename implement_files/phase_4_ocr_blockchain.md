# Phase 4 — OCR Pipeline + Blockchain Audit Trail

**Goal:** Two independent but Phase-4-grouped systems: (1) the region-aware hybrid OCR pipeline for handwritten/external prescriptions and lab reports, and (2) the prescription audit blockchain layer with BullMQ async processing. Both are paper-worthy contributions.

**Duration:** 3 weeks
**Prerequisites:** Phases 1-3 complete; handwritten prescription samples collected (100+); Polygon/Sepolia accounts set up
**Output:** External prescription OCR working, blockchain audit live on testnet with full async architecture

---

## 4.1 OCR Pipeline Architecture

### The full pipeline

```
User uploads prescription image
    ↓
[Stage 1] Image preprocessing (OpenCV)
    ↓
[Stage 2] Region detection (fine-tuned YOLOv8)
    ↓ (header, body, footer, signature regions)
    ↓
[Stage 3] Per-region OCR
    Header/Footer → Google Cloud Vision (printed)
    Body → TrOCR fine-tuned (handwritten)
    ↓
[Stage 4] LLM semantic extraction
    Raw OCR text → structured medication JSON
    ↓
[Stage 5] Drug normalization (RxNorm + India brands)
    ↓
[Stage 6] Confidence aggregation per field
    ↓
[Stage 7] User verification (low-confidence fields highlighted)
    ↓
Save to MongoDB as EXTERNAL_OCR prescription
```

### Adding to AI service

```
apps/ai-service/src/
├── ocr/
│   ├── preprocessor.py
│   ├── region_detector.py        # YOLOv8 model
│   ├── ocr_engines.py            # Google Vision + TrOCR wrappers
│   ├── llm_extractor.py
│   ├── normalizer.py
│   ├── confidence_aggregator.py
│   └── pipeline.py               # Orchestrator
├── api/routes/
│   └── ocr.py                    # /api/ai/ocr/prescription endpoint
└── training/
    ├── train_region_detector.py  # YOLO fine-tuning
    └── train_trocr.py            # TrOCR fine-tuning
```

---

## 4.2 Stage 1 — Image Preprocessing

```python
# src/ocr/preprocessor.py
import cv2
import numpy as np

def preprocess(image_path: str) -> np.ndarray:
    img = cv2.imread(image_path)
    
    # 1. Auto-rotate based on EXIF
    # (PIL handles this; or use cv2.rotate based on detected text orientation)
    
    # 2. Convert to grayscale for some operations
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Deskew — detect text angle and rotate
    angle = detect_skew_angle(gray)
    if abs(angle) > 0.5:
        img = rotate_image(img, angle)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 4. Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    
    # 5. Adaptive contrast (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    
    # 6. Optional: shadow removal
    # Subtract local median to remove uneven lighting
    median = cv2.medianBlur(enhanced, 51)
    shadow_removed = cv2.absdiff(enhanced, median)
    shadow_removed = 255 - shadow_removed                # invert back
    
    # 7. Return enhanced grayscale + original color for OCR engines
    return {
        "original": img,
        "enhanced_gray": enhanced,
        "shadow_removed": shadow_removed
    }

def detect_skew_angle(gray: np.ndarray) -> float:
    """Detect text rotation angle via Hough transform."""
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100, minLineLength=100, maxLineGap=10)
    if lines is None:
        return 0
    
    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if -45 < angle < 45:
            angles.append(angle)
    
    return np.median(angles) if angles else 0

def rotate_image(img: np.ndarray, angle: float) -> np.ndarray:
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1)
    return cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REPLICATE)
```

---

## 4.3 Stage 2 — Region Detection (Your YOLO Contribution)

### Data preparation

You've been collecting handwritten prescription samples. Annotate them in Label Studio:

```
Annotation classes:
- HEADER (clinic name, doctor name, address)
- PATIENT_INFO (name, age, sex, date)
- DIAGNOSIS (Rx, complaint, vitals if present)
- MEDICATIONS (the prescription body — most important)
- FOOTER (signature, stamp)
- INVESTIGATIONS (lab orders if present)
```

Export YOLO format: each image has a corresponding `.txt` with `class_id cx cy w h` (normalized).

### Training

```python
# src/training/train_region_detector.py
from ultralytics import YOLO

# Start from pretrained YOLOv8n (small) for fast inference
model = YOLO('yolov8n.pt')

results = model.train(
    data='data/prescriptions/data.yaml',     # YOLO dataset config
    epochs=100,
    imgsz=640,
    batch=16,
    name='prescription_regions',
    patience=15,
    save_period=10,
    device=0
)

# Validate
metrics = model.val()
print(f"mAP50: {metrics.box.map50}")
print(f"mAP50-95: {metrics.box.map}")
```

`data/prescriptions/data.yaml`:

```yaml
path: ../data/prescriptions
train: images/train
val: images/val
test: images/test

names:
  0: HEADER
  1: PATIENT_INFO
  2: DIAGNOSIS
  3: MEDICATIONS
  4: FOOTER
  5: INVESTIGATIONS
```

### Inference service

```python
# src/ocr/region_detector.py
from ultralytics import YOLO
import numpy as np

_model = None

def init():
    global _model
    _model = YOLO('checkpoints/prescription_regions/best.pt')

def detect_regions(image: np.ndarray) -> list:
    results = _model(image, verbose=False)[0]
    
    regions = []
    for box in results.boxes:
        class_id = int(box.cls[0])
        class_name = _model.names[class_id]
        confidence = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        
        regions.append({
            "class": class_name,
            "confidence": confidence,
            "bbox": (x1, y1, x2, y2),
            "image_crop": image[y1:y2, x1:x2]
        })
    
    return regions
```

### Realistic targets

With 500-1000 annotated samples and YOLOv8n: mAP@50 of 0.85+ is realistic. Your YOLO breast cancer detection experience directly applies here.

---

## 4.4 Stage 3 — OCR Engines

### Google Cloud Vision (printed regions)

Free tier: 1000 documents/month. More than enough for development.

```python
# src/ocr/ocr_engines.py
from google.cloud import vision_v1

_vision_client = None

def init_vision():
    global _vision_client
    _vision_client = vision_v1.ImageAnnotatorClient()

def ocr_printed(image_bytes: bytes) -> dict:
    image = vision_v1.Image(content=image_bytes)
    response = _vision_client.document_text_detection(image=image)
    
    full_text = response.full_text_annotation.text
    
    # Extract confidence per word
    words = []
    for page in response.full_text_annotation.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    text = ''.join(s.text for s in word.symbols)
                    confidence = word.confidence
                    words.append({"text": text, "confidence": confidence})
    
    return {
        "text": full_text,
        "words": words,
        "avg_confidence": np.mean([w['confidence'] for w in words]) if words else 0
    }
```

### TrOCR for handwritten regions

Base: `microsoft/trocr-large-handwritten`. Fine-tune on your annotated handwritten regions.

```python
# src/training/train_trocr.py
from transformers import (
    TrOCRProcessor, 
    VisionEncoderDecoderModel,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer
)
from datasets import Dataset
from PIL import Image
import torch

processor = TrOCRProcessor.from_pretrained("microsoft/trocr-large-handwritten")
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-large-handwritten")

# Configure decoder
model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
model.config.pad_token_id = processor.tokenizer.pad_token_id
model.config.vocab_size = model.config.decoder.vocab_size

# Load dataset: each row is {image_path, text}
# From your annotated prescriptions — crop the MEDICATIONS region, transcribe by hand

def preprocess(example):
    image = Image.open(example['image_path']).convert("RGB")
    pixel_values = processor(image, return_tensors="pt").pixel_values.squeeze()
    labels = processor.tokenizer(
        example['text'], 
        padding="max_length", 
        max_length=128
    ).input_ids
    labels = [l if l != processor.tokenizer.pad_token_id else -100 for l in labels]
    
    return {"pixel_values": pixel_values, "labels": labels}

dataset = Dataset.from_json("data/prescriptions/trocr_train.json")
dataset = dataset.map(preprocess, remove_columns=dataset.column_names)

args = Seq2SeqTrainingArguments(
    output_dir="./checkpoints/trocr-medical-handwritten",
    per_device_train_batch_size=4,                # large model, small batch
    gradient_accumulation_steps=4,
    learning_rate=5e-5,
    num_train_epochs=10,
    fp16=True,
    save_steps=100,
    eval_steps=100,
    logging_steps=10,
    predict_with_generate=True
)

trainer = Seq2SeqTrainer(
    model=model,
    args=args,
    train_dataset=dataset['train'],
    eval_dataset=dataset['test'],
    data_collator=default_data_collator,
    tokenizer=processor.feature_extractor
)

trainer.train()
trainer.save_model("checkpoints/trocr-medical-handwritten-final")
```

### Inference

```python
def ocr_handwritten(image: np.ndarray) -> dict:
    pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    pixel_values = trocr_processor(pil_image, return_tensors="pt").pixel_values.to(device)
    
    generated_ids = trocr_model.generate(pixel_values, max_length=128, num_beams=5)
    text = trocr_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    
    # TrOCR doesn't give per-word confidence directly; use sequence score as proxy
    with torch.no_grad():
        outputs = trocr_model(pixel_values=pixel_values, labels=generated_ids)
        loss = outputs.loss
    confidence = float(torch.exp(-loss))
    
    return {"text": text, "confidence": confidence}
```

---

## 4.5 Stage 4 — LLM Semantic Extraction

### The prompt

```python
# src/ocr/llm_extractor.py
import anthropic
import json

EXTRACTION_SYSTEM_PROMPT = """You are a medical prescription parser specialized in Indian healthcare prescriptions. Given OCR output (which may contain errors), extract structured medication information.

Important conventions in Indian prescriptions:
- BD = twice daily; TDS = three times daily; QID = four times daily; OD = once daily; SOS = as needed
- Format like "1-0-1" means morning-noon-night dosing
- "ac" = before meals; "pc" = after meals; "hs" = at bedtime
- Common brand abbreviations: Pcm = Paracetamol, Met = Metformin, Amox = Amoxicillin

For each medication, output:
- drug_raw: as written in prescription
- drug_name: generic name (your best inference)
- strength: e.g., "500mg", "5ml"
- form: tablet/capsule/syrup/injection/etc
- frequency: standardized (ONCE_DAILY, TWICE_DAILY, etc.)
- timing: when in day (MORNING, EVENING, etc.)
- duration_value + duration_unit
- route: ORAL/IV/TOPICAL/etc.
- confidence: 0.0-1.0 (your confidence in this extraction)
- notes: any special instructions

If you cannot parse a line confidently, set confidence < 0.5 and include the raw text in `drug_raw` with `extraction_failed: true`.

Output JSON only, no prose."""

def extract_medications(ocr_text: str) -> dict:
    client = anthropic.Anthropic()
    
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2000,
        system=EXTRACTION_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"OCR output from prescription:\n\n{ocr_text}\n\nExtract all medications as JSON array."
        }]
    )
    
    raw = response.content[0].text.strip()
    # Strip code fences if present
    raw = raw.replace("```json", "").replace("```", "").strip()
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"medications": [], "error": "LLM output unparseable", "raw": raw}
```

---

## 4.6 Stage 5 — Drug Normalization

This is where the Indian context matters.

```python
# src/ocr/normalizer.py
import httpx
from rapidfuzz import process, fuzz

class DrugNormalizer:
    def __init__(self):
        # Pre-load India drug mappings into memory
        self.india_drugs = load_india_drug_mapping()        # from MongoDB ref data
        self.rxnorm_lookup = {}                              # cache
    
    async def normalize(self, drug_name: str) -> dict:
        """Map free-text drug name to RxNorm CUI + Indian brand info."""
        result = {
            "raw_input": drug_name,
            "rxnorm_cui": None,
            "generic_name": None,
            "matched_brand": None,
            "is_indian_brand": False,
            "match_confidence": 0.0,
            "match_method": None
        }
        
        # 1. Try Indian brand exact + fuzzy match first
        india_match = process.extractOne(
            drug_name,
            self.india_drugs.keys(),
            scorer=fuzz.WRatio,
            score_cutoff=85
        )
        
        if india_match:
            brand, score, _ = india_match
            india_data = self.india_drugs[brand]
            result.update({
                "matched_brand": brand,
                "is_indian_brand": True,
                "generic_name": india_data['generic'],
                "rxnorm_cui": india_data.get('rxnorm_cui'),
                "match_confidence": score / 100,
                "match_method": "INDIA_BRAND_FUZZY"
            })
            return result
        
        # 2. Try RxNorm direct lookup
        rxnorm_result = await self.query_rxnorm(drug_name)
        if rxnorm_result:
            result.update(rxnorm_result)
            result['match_method'] = "RXNORM_DIRECT"
            return result
        
        # 3. Try RxNorm approximate match
        approx_result = await self.query_rxnorm_approximate(drug_name)
        if approx_result:
            result.update(approx_result)
            result['match_method'] = "RXNORM_APPROX"
            return result
        
        result['match_method'] = "NO_MATCH"
        return result
    
    async def query_rxnorm(self, name: str):
        """Query RxNorm public API."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://rxnav.nlm.nih.gov/REST/rxcui.json",
                params={"name": name}
            )
            data = resp.json()
            cui = data.get('idGroup', {}).get('rxnormId', [None])[0]
            if cui:
                return {"rxnorm_cui": cui, "match_confidence": 1.0}
        return None
    
    async def query_rxnorm_approximate(self, name: str):
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://rxnav.nlm.nih.gov/REST/approximateTerm.json",
                params={"term": name, "maxEntries": 5}
            )
            data = resp.json()
            candidates = data.get('approximateGroup', {}).get('candidate', [])
            if candidates:
                top = candidates[0]
                return {
                    "rxnorm_cui": top['rxcui'],
                    "match_confidence": float(top['score']) / 100
                }
        return None
```

### India drug mapping data

Build `india_drug_mapping.json`:

```json
{
  "Crocin": {"generic": "Paracetamol", "rxnorm_cui": "161", "strengths": ["500mg", "650mg"]},
  "Dolo": {"generic": "Paracetamol", "rxnorm_cui": "161", "strengths": ["650mg"]},
  "Metformin": {"generic": "Metformin", "rxnorm_cui": "6809", "strengths": ["500mg", "850mg", "1000mg"]},
  "Glycomet": {"generic": "Metformin", "rxnorm_cui": "6809"},
  // ~3000 entries
}
```

Sources: scrape 1mg/Netmeds (carefully, with rate limiting), or use GitHub datasets like `india-drug-database`.

---

## 4.7 Stage 6 — Confidence Aggregation

```python
# src/ocr/confidence_aggregator.py
def aggregate_confidence(med: dict, ocr_conf: float, llm_conf: float, normalize_conf: float) -> dict:
    """Combine confidences from each pipeline stage."""
    
    # Field-level confidence
    drug_name_conf = min(ocr_conf, llm_conf, normalize_conf)
    strength_conf = min(ocr_conf, llm_conf)               # normalization doesn't affect strength
    frequency_conf = min(ocr_conf, llm_conf)
    duration_conf = min(ocr_conf, llm_conf)
    
    # Overall = lowest of all (weakest link)
    overall_conf = min(drug_name_conf, strength_conf, frequency_conf, duration_conf)
    
    med['confidence'] = {
        "drug_name": drug_name_conf,
        "strength": strength_conf,
        "frequency": frequency_conf,
        "duration": duration_conf,
        "overall": overall_conf,
        "needs_review": overall_conf < 0.85
    }
    return med
```

---

## 4.8 The Full Orchestrator

```python
# src/ocr/pipeline.py
from .preprocessor import preprocess
from .region_detector import detect_regions
from .ocr_engines import ocr_printed, ocr_handwritten
from .llm_extractor import extract_medications
from .normalizer import DrugNormalizer
from .confidence_aggregator import aggregate_confidence

class OCRPipeline:
    def __init__(self):
        self.normalizer = DrugNormalizer()
    
    async def process_prescription(self, image_path: str) -> dict:
        # Stage 1: preprocess
        processed = preprocess(image_path)
        image = processed['shadow_removed']
        
        # Stage 2: detect regions
        regions = detect_regions(image)
        
        # Stage 3: OCR each region
        ocr_results = {}
        for region in regions:
            crop = region['image_crop']
            if region['class'] in ['HEADER', 'FOOTER', 'PATIENT_INFO']:
                ocr_results[region['class']] = ocr_printed(image_to_bytes(crop))
            elif region['class'] == 'MEDICATIONS':
                ocr_results[region['class']] = ocr_handwritten(crop)
            # Skip signature/stamp regions
        
        # Stage 4: LLM extraction on medications region
        meds_text = ocr_results.get('MEDICATIONS', {}).get('text', '')
        extracted = extract_medications(meds_text)
        
        ocr_conf = ocr_results.get('MEDICATIONS', {}).get('confidence', 0)
        
        # Stage 5: normalize each medication
        for med in extracted.get('medications', []):
            normalization = await self.normalizer.normalize(med.get('drug_name', med.get('drug_raw')))
            med['rxnorm_cui'] = normalization['rxnorm_cui']
            med['generic_name'] = normalization['generic_name']
            med['matched_brand'] = normalization['matched_brand']
            med['is_indian_brand'] = normalization['is_indian_brand']
            
            # Stage 6: aggregate confidence
            med = aggregate_confidence(
                med, 
                ocr_conf, 
                med.get('confidence', 0.5), 
                normalization['match_confidence']
            )
        
        # Extract metadata from header
        header_info = parse_header(ocr_results.get('HEADER', {}).get('text', ''))
        patient_info = parse_patient_info(ocr_results.get('PATIENT_INFO', {}).get('text', ''))
        
        return {
            "header": header_info,
            "patient_info": patient_info,
            "medications": extracted.get('medications', []),
            "needs_review": any(m['confidence']['needs_review'] for m in extracted.get('medications', [])),
            "raw_ocr": ocr_results
        }
```

### Endpoint

```python
# src/api/routes/ocr.py
@router.post("/ocr/prescription")
async def ocr_prescription(image: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        content = await image.read()
        tmp.write(content)
        tmp.flush()
        result = await ocr_pipeline.process_prescription(tmp.name)
    return result
```

### Backend integration for external prescription upload

```typescript
// apps/backend/src/services/external-prescription.service.ts
async function uploadExternalPrescription(patientId: string, imageBuffer: Buffer) {
  // 1. Save raw image
  const imageUrl = await uploadToS3(imageBuffer, `external-rx/${patientId}/${Date.now()}.jpg`);
  
  // 2. Send to OCR pipeline
  const ocrResult = await aiClient.ocrPrescription(imageBuffer);
  
  // 3. Create prescription as EXTERNAL_OCR with low trust
  const prescription = await Prescription.create({
    patientId,
    source: 'EXTERNAL_OCR',
    medications: ocrResult.medications.map(m => ({
      rxnormCui: m.rxnorm_cui,
      genericName: m.generic_name,
      brandName: m.matched_brand,
      strength: m.strength,
      form: m.form,
      dosage: { /* mapped */ },
      // No safety checks — these come from a different system, not vetted
    })),
    attachmentUrls: [imageUrl],
    externalUpload: {
      uploadedByPatient: true,
      uploadedAt: new Date(),
      ocrConfidence: averageConfidence(ocrResult.medications),
      verifiedByLab: false                          // user must verify
    }
  });
  
  // 4. Return to frontend for user verification
  return { prescription, ocrResult };
}
```

Frontend shows extracted medications with low-confidence fields highlighted in yellow. User confirms or corrects each. On save:

- Update prescription with user-confirmed values
- Add to patient's medication history for future interaction checks
- DO NOT anchor to blockchain (external source, we can't vouch)

---

## 4.9 Blockchain Layer

Now the second half of Phase 4: the prescription audit blockchain.

### Smart contract

```solidity
// contracts/PrescriptionAudit.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract PrescriptionAudit is AccessControl {
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");
    
    enum RecordType { PRESCRIPTION, LAB_REPORT, PRESCRIPTION_FULFILLMENT, CONSENT }
    
    struct Record {
        bytes32 contentHash;
        uint64 timestamp;
        RecordType recordType;
        bytes32 patientIdHash;          // hashed, not raw
        bytes32 issuerIdHash;            // doctor or lab hashed
        bool exists;
    }
    
    mapping(bytes32 => Record) public records;
    
    event RecordAnchored(
        bytes32 indexed recordId,
        bytes32 contentHash,
        RecordType recordType,
        bytes32 indexed patientIdHash,
        bytes32 indexed issuerIdHash,
        uint64 timestamp
    );
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ANCHOR_ROLE, msg.sender);
    }
    
    function anchorRecord(
        bytes32 recordId,
        bytes32 contentHash,
        RecordType recordType,
        bytes32 patientIdHash,
        bytes32 issuerIdHash
    ) external onlyRole(ANCHOR_ROLE) {
        require(!records[recordId].exists, "Already anchored");
        require(contentHash != bytes32(0), "Empty hash");
        
        records[recordId] = Record({
            contentHash: contentHash,
            timestamp: uint64(block.timestamp),
            recordType: recordType,
            patientIdHash: patientIdHash,
            issuerIdHash: issuerIdHash,
            exists: true
        });
        
        emit RecordAnchored(recordId, contentHash, recordType, patientIdHash, issuerIdHash, uint64(block.timestamp));
    }
    
    function verifyRecord(bytes32 recordId, bytes32 expectedHash) external view returns (bool valid, uint64 anchoredAt) {
        Record memory r = records[recordId];
        return (r.exists && r.contentHash == expectedHash, r.timestamp);
    }
    
    function getRecord(bytes32 recordId) external view returns (Record memory) {
        return records[recordId];
    }
}
```

### Deployment

Use Hardhat:

```
apps/blockchain-contracts/
├── contracts/
│   └── PrescriptionAudit.sol
├── scripts/
│   ├── deploy.ts
│   └── verify.ts
├── test/
│   └── PrescriptionAudit.test.ts
├── hardhat.config.ts
└── package.json
```

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!]
    },
    polygon_amoy: {                              // Polygon testnet
      url: process.env.AMOY_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!]
    },
    polygon_mainnet: {
      url: process.env.POLYGON_MAINNET_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!]
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY!,
      polygonAmoy: process.env.POLYGONSCAN_API_KEY!
    }
  }
};
```

```typescript
// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const Contract = await ethers.getContractFactory("PrescriptionAudit");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("PrescriptionAudit deployed to:", address);
  
  // Save to backend env
  console.log("Set PRESCRIPTION_AUDIT_CONTRACT_ADDRESS=" + address);
}

main().catch(console.error);
```

Deploy to Sepolia first (free), then to Polygon Amoy (Polygon testnet), then mainnet when ready.

### Tests

```typescript
// test/PrescriptionAudit.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrescriptionAudit", () => {
  it("anchors a record correctly", async () => {
    const [owner] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("PrescriptionAudit");
    const contract = await Contract.deploy();
    
    const recordId = ethers.keccak256(ethers.toUtf8Bytes("rx-001"));
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("prescription content"));
    const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-001"));
    const issuerHash = ethers.keccak256(ethers.toUtf8Bytes("doctor-001"));
    
    await contract.anchorRecord(recordId, contentHash, 0, patientHash, issuerHash);
    
    const [valid, ts] = await contract.verifyRecord(recordId, contentHash);
    expect(valid).to.be.true;
    
    const [invalid] = await contract.verifyRecord(
      recordId, 
      ethers.keccak256(ethers.toUtf8Bytes("wrong content"))
    );
    expect(invalid).to.be.false;
  });
  
  it("rejects duplicate anchoring", async () => {
    // ...
  });
  
  it("only ANCHOR_ROLE can anchor", async () => {
    // ...
  });
});
```

---

## 4.10 BullMQ Async Worker

The worker is a separate Node.js process.

```
apps/blockchain-worker/
├── src/
│   ├── workers/
│   │   ├── anchor-prescription.worker.ts
│   │   ├── anchor-fulfillment.worker.ts
│   │   └── dead-letter.worker.ts
│   ├── services/
│   │   ├── ethereum.service.ts
│   │   └── contract-client.ts
│   ├── config.ts
│   └── index.ts
├── package.json
```

### Worker entry point

```typescript
// src/index.ts
import { Worker } from 'bullmq';
import { redisConnection } from './config';
import { anchorPrescription } from './workers/anchor-prescription.worker';
import { anchorFulfillment } from './workers/anchor-fulfillment.worker';

const prescriptionWorker = new Worker('blockchain-audit', async (job) => {
  switch (job.name) {
    case 'anchor-prescription':
      return await anchorPrescription(job);
    case 'anchor-fulfillment':
      return await anchorFulfillment(job);
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}, {
  connection: redisConnection,
  concurrency: 5,
  limiter: { max: 10, duration: 1000 }            // 10 anchor calls per second max
});

prescriptionWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

prescriptionWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log('Blockchain worker started');
```

### The anchor worker

```typescript
// src/workers/anchor-prescription.worker.ts
import { Job } from 'bullmq';
import { Prescription } from '@medvault/shared-types';
import { ContractClient } from '../services/contract-client';
import { sha256 } from '../utils/hash';

const contract = new ContractClient();

export async function anchorPrescription(job: Job) {
  const { prescriptionId } = job.data;
  
  // 1. Load prescription
  const prescription = await db.collection('prescriptions').findOne({ _id: prescriptionId });
  if (!prescription) throw new Error('Prescription not found');
  
  // 2. Compute content hash (canonical serialization)
  const canonical = canonicalizeForHashing(prescription);
  const contentHash = '0x' + sha256(canonical);
  
  // 3. Compute hashed IDs (privacy)
  const patientIdHash = '0x' + sha256(prescription.patientId.toString() + process.env.HASH_SALT);
  const issuerIdHash = '0x' + sha256(prescription.doctorId.toString() + process.env.HASH_SALT);
  const recordIdHash = '0x' + sha256(prescription._id.toString());
  
  // 4. Mark as PENDING
  await db.collection('prescriptions').updateOne(
    { _id: prescriptionId },
    { 
      'blockchain.status': 'PENDING',
      'blockchain.contentHash': contentHash
    }
  );
  
  try {
    // 5. Submit to chain
    const tx = await contract.anchorRecord(
      recordIdHash,
      contentHash,
      0,                                          // PRESCRIPTION enum value
      patientIdHash,
      issuerIdHash
    );
    
    const receipt = await tx.wait();
    
    // 6. Update status
    await db.collection('prescriptions').updateOne(
      { _id: prescriptionId },
      {
        'blockchain.status': 'ANCHORED',
        'blockchain.txHash': receipt.hash,
        'blockchain.blockNumber': receipt.blockNumber,
        'blockchain.anchoredAt': new Date()
      }
    );
    
    // 7. Optional: notify backend via WebSocket
    await notifyBackend('prescription-anchored', { prescriptionId, txHash: receipt.hash });
    
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (error) {
    // Will retry via BullMQ. If exhausts retries, goes to dead letter.
    throw error;
  }
}
```

### Job options (retry config)

When enqueueing from backend:

```typescript
// apps/backend/src/jobs/blockchain.queue.ts
import { Queue } from 'bullmq';

export const blockchainQueue = new Queue('blockchain-audit', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000                                   // 5s, 10s, 20s, 40s, 80s
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: false                             // keep failed for dead letter handling
  }
});

export async function enqueuePrescriptionAnchor(prescriptionId: string) {
  await blockchainQueue.add(
    'anchor-prescription',
    { prescriptionId },
    { jobId: `rx-${prescriptionId}` }              // dedupe
  );
}
```

### Canonical serialization (critical for hash consistency)

```typescript
// shared/canonicalize.ts
export function canonicalizeForHashing(prescription: Prescription): string {
  // Only include immutable, content-defining fields
  const canonical = {
    prescriptionNumber: prescription.prescriptionNumber,
    patientId: prescription.patientId.toString(),
    doctorId: prescription.doctorId.toString(),
    clinicId: prescription.clinicId.toString(),
    createdAt: prescription.createdAt.toISOString(),
    diagnosis: prescription.diagnosis.map(d => ({ icd10: d.icd10Code, primary: !!d.isPrimary })).sort((a, b) => a.icd10.localeCompare(b.icd10)),
    medications: prescription.medications.map(m => ({
      cui: m.rxnormCui,
      strength: m.strength,
      form: m.form,
      route: m.route,
      frequency: m.dosage.frequency,
      duration: `${m.dosage.duration.value}${m.dosage.duration.unit}`
    })).sort((a, b) => a.cui.localeCompare(b.cui)),
    labOrders: (prescription.labOrders || []).map(l => l.loincCode).sort()
  };
  
  return JSON.stringify(canonical);                 // deterministic key order via construction
}
```

CRITICAL: this function must produce identical output for the same prescription every time. Any non-determinism = hash mismatch on verification. Test extensively.

### Verification endpoint

```typescript
// apps/backend/src/routes/verification.ts
router.get('/api/prescriptions/:id/verify', async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  
  if (prescription.blockchain.status !== 'ANCHORED') {
    return res.json({ verified: false, reason: 'Not yet anchored' });
  }
  
  // Recompute hash from current state
  const canonical = canonicalizeForHashing(prescription);
  const currentHash = '0x' + sha256(canonical);
  
  // Verify on-chain
  const recordIdHash = '0x' + sha256(prescription._id.toString());
  const [valid, anchoredAt] = await contractClient.verifyRecord(recordIdHash, currentHash);
  
  res.json({
    verified: valid,
    anchoredAt: new Date(Number(anchoredAt) * 1000),
    contentHash: currentHash,
    onChainHash: prescription.blockchain.contentHash,
    txHash: prescription.blockchain.txHash,
    blockNumber: prescription.blockchain.blockNumber,
    explorerUrl: `https://sepolia.etherscan.io/tx/${prescription.blockchain.txHash}`,
    tampered: !valid && prescription.blockchain.contentHash !== currentHash
  });
});
```

If `tampered: true` — someone modified the prescription in MongoDB after anchoring. That's a critical alert.

### Dead letter handling

Jobs that exhaust retries:

```typescript
// src/workers/dead-letter.worker.ts
prescriptionWorker.on('failed', async (job, error) => {
  if (job.attemptsMade >= job.opts.attempts) {
    // Final failure
    await db.collection('prescriptions').updateOne(
      { _id: job.data.prescriptionId },
      {
        'blockchain.status': 'FAILED',
        'blockchain.failureReason': error.message,
        'blockchain.failedAt': new Date()
      }
    );
    
    // Alert admin
    await sendAdminAlert(`Blockchain anchor failed permanently for ${job.data.prescriptionId}: ${error.message}`);
    
    // Move to dead letter queue for manual review
    await deadLetterQueue.add('failed-blockchain-anchor', job.data);
  }
});
```

---

## 4.11 PDF/Display Integration

Update the prescription PDF (from Phase 2) to include blockchain verification status:

In the PDF footer:

```html
<div class="verification-footer">
  <div class="badge">
    <span>NMC Verified Doctor</span> ✓
  </div>
  <div class="badge">
    <span>HFR Verified Clinic</span> ✓
  </div>
  <div class="badge">
    <span>Blockchain Anchored</span>
    <span class="hash">{{ blockchain.contentHash | slice:0:10 }}...{{ blockchain.contentHash | slice:-6 }}</span>
    <a href="{{ explorerUrl }}">View on chain</a>
  </div>
</div>
```

Patient-facing app shows the same.

---

## 4.12 Checklist — Definition of Done for Phase 4

OCR side:
- [ ] 100+ handwritten prescription samples annotated in Label Studio
- [ ] YOLOv8 region detector trained, mAP@50 > 0.85
- [ ] TrOCR fine-tuned on handwritten medical samples
- [ ] Google Cloud Vision integrated for printed regions
- [ ] LLM extraction returning structured medication JSON
- [ ] Drug normalization handling Indian brands (Crocin → Paracetamol → RxNorm CUI)
- [ ] Confidence aggregation flagging low-confidence fields
- [ ] Full pipeline: image upload → structured prescription in <30s
- [ ] User verification UI for low-confidence fields
- [ ] External prescriptions saved with `source: 'EXTERNAL_OCR'`, no blockchain anchor

Blockchain side:
- [ ] PrescriptionAudit.sol deployed to Sepolia, verified on Etherscan
- [ ] Hardhat tests passing
- [ ] BullMQ worker running as separate process
- [ ] Prescription save → queued → anchored in <60s on testnet
- [ ] Async architecture: user-perceived save latency unchanged
- [ ] Retry logic working (test by temporarily breaking RPC)
- [ ] Dead letter queue catches exhausted retries
- [ ] Verification endpoint returns valid for unmodified prescriptions
- [ ] Verification endpoint returns invalid + `tampered: true` for modified prescriptions
- [ ] PDF includes blockchain badge + explorer link

When you can demo: upload a photo of an old handwritten prescription → see medications extracted with confidence scores → confirm fields → saved to history → in another flow, doctor writes a new prescription → in background, hash appears on Sepolia testnet → click "verify" → green check + Etherscan link — Phase 4 is done.

---

## Parallel Work to Continue

- Phase 5: complete UI designs, get user feedback on Figma mockups before coding
- Throughout: write paper sections as each phase completes
