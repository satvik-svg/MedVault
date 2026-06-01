# Phase 3 — AI Layer: NER, Classifier, Whisper, LLM Summary

**Goal:** Stand up the FastAPI AI service with the full clinical NLP pipeline — symptom NER, differential diagnosis classifier, Whisper voice intake, LLM-generated summaries, and symptom recurrence matching. Integrate with Phase 2's records flow so doctors see AI-assisted information.

**Duration:** 3-4 weeks
**Prerequisites:** Phase 1 + Phase 2 complete; GPU available; i2b2 access approved; DDXPlus downloaded; Whisper training data collected
**Output:** Working AI service with 5 endpoints, all models trained and deployed

---

## 3.1 AI Service Setup

### Repo structure

```
apps/ai-service/
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── transcribe.py       # Whisper endpoint
│   │   │   ├── ner.py              # Symptom NER
│   │   │   ├── diagnose.py         # Differential diagnosis
│   │   │   ├── summarize.py        # LLM patient summary
│   │   │   └── recurrence.py       # Symptom recurrence matching
│   │   └── deps.py                 # FastAPI dependencies
│   ├── models/
│   │   ├── whisper_service.py
│   │   ├── ner_service.py
│   │   ├── classifier_service.py
│   │   ├── llm_service.py
│   │   └── embedding_service.py
│   ├── pipelines/
│   │   ├── symptom_pipeline.py     # NER → UMLS → classifier
│   │   └── red_flag_detector.py
│   ├── data/
│   │   ├── umls_linker.py
│   │   ├── india_disease_weights.py
│   │   └── red_flags.py
│   ├── training/                   # offline training scripts
│   │   ├── train_ner.py
│   │   ├── train_classifier.py
│   │   ├── train_whisper_lora.py
│   │   └── evaluation/
│   ├── utils/
│   ├── config.py
│   └── main.py                     # FastAPI app
├── data/                           # gitignored
│   ├── i2b2/
│   ├── ddxplus/
│   ├── whisper_clips/
│   └── models/                     # trained checkpoints
├── notebooks/                      # for experimentation
├── pyproject.toml
└── Dockerfile
```

### Dependencies

```toml
# pyproject.toml
[project]
name = "medvault-ai"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]",
  "pydantic>=2.5",
  
  # Core ML
  "torch>=2.1",
  "transformers>=4.40",
  "datasets>=2.20",
  "peft>=0.11",                     # LoRA
  "accelerate>=0.30",
  "evaluate>=0.4",
  
  # Whisper
  "faster-whisper>=1.0",
  
  # Classical ML
  "xgboost>=2.0",
  "scikit-learn>=1.5",
  "numpy>=1.26",
  "pandas>=2.2",
  
  # NLP
  "spacy>=3.7",
  "scispacy>=0.5.4",
  
  # Audio
  "librosa>=0.10",
  "soundfile>=0.12",
  
  # LLM clients
  "anthropic>=0.30",
  "google-generativeai>=0.7",
  
  # Vector similarity
  "sentence-transformers>=3.0",
  "faiss-cpu>=1.8",
  
  # Async
  "httpx>=0.27",
  "redis>=5.0",
]
```

GPU-specific install: `pip install torch --index-url https://download.pytorch.org/whl/cu121`

### Main entry point

```python
# src/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .api.routes import transcribe, ner, diagnose, summarize, recurrence
from .models import whisper_service, ner_service, classifier_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models on startup (lazy load is bad for first-request latency)
    print("Loading Whisper...")
    whisper_service.init()
    print("Loading NER pipeline...")
    ner_service.init()
    print("Loading classifier...")
    classifier_service.init()
    print("Models ready.")
    yield
    # Cleanup

app = FastAPI(title="MedVault AI", lifespan=lifespan)
app.include_router(transcribe.router, prefix="/api/ai")
app.include_router(ner.router, prefix="/api/ai")
app.include_router(diagnose.router, prefix="/api/ai")
app.include_router(summarize.router, prefix="/api/ai")
app.include_router(recurrence.router, prefix="/api/ai")
```

Run: `uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 1` (single worker because models hold GPU memory).

---

## 3.2 Whisper Service (Patient Voice Intake)

### Why faster-whisper not openai-whisper

`faster-whisper` uses CTranslate2 backend, 4-8x faster on GPU, identical accuracy. Drop-in replacement.

### Stage 1: deploy baseline with faster-whisper

```python
# src/models/whisper_service.py
from faster_whisper import WhisperModel
import torch

_model = None
_lora_adapter_path = None

def init():
    global _model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    
    _model = WhisperModel("base", device=device, compute_type=compute_type)
    
    # Phase 3 second milestone: load LoRA adapter
    # (LoRA fine-tuning produces adapter that converts via CTranslate2 export)
    
def transcribe(audio_path: str, language: str = "en") -> dict:
    segments, info = _model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )
    
    full_text = ""
    segment_list = []
    for seg in segments:
        full_text += seg.text + " "
        segment_list.append({
            "start": seg.start,
            "end": seg.end,
            "text": seg.text.strip()
        })
    
    return {
        "text": full_text.strip(),
        "language": info.language,
        "duration": info.duration,
        "segments": segment_list
    }
```

### Stage 2: LoRA fine-tuning for Indian medical English

This is the research contribution. Training script structure:

```python
# src/training/train_whisper_lora.py
import torch
from transformers import (
    WhisperProcessor, 
    WhisperForConditionalGeneration,
    Seq2SeqTrainingArguments, 
    Seq2SeqTrainer
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import load_dataset, Audio

# 1. Load base model
model_id = "openai/whisper-base"
processor = WhisperProcessor.from_pretrained(model_id)
model = WhisperForConditionalGeneration.from_pretrained(model_id)
model.config.use_cache = False

# 2. Configure LoRA
lora_config = LoraConfig(
    r=16,                              # rank
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="SEQ_2_SEQ_LM"
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()    # should print ~1-2% trainable

# 3. Load dataset (your custom recordings + IndicSUPERB filtered subset)
# Structure: {"audio": path, "transcription": text}
train_data = load_dataset("json", data_files="data/whisper_clips/train.json")
train_data = train_data.cast_column("audio", Audio(sampling_rate=16000))

def prepare_batch(batch):
    audio = batch["audio"]
    batch["input_features"] = processor.feature_extractor(
        audio["array"], sampling_rate=16000
    ).input_features[0]
    batch["labels"] = processor.tokenizer(batch["transcription"]).input_ids
    return batch

train_data = train_data.map(prepare_batch, remove_columns=["audio", "transcription"])

# 4. Training
training_args = Seq2SeqTrainingArguments(
    output_dir="./checkpoints/whisper-lora-medical-indian",
    per_device_train_batch_size=16,
    gradient_accumulation_steps=2,
    learning_rate=1e-3,                # higher than full fine-tune
    warmup_steps=50,
    num_train_epochs=8,
    fp16=True,
    save_steps=200,
    eval_steps=200,
    logging_steps=20,
    report_to="tensorboard"
)

trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=train_data["train"],
    eval_dataset=train_data["test"],
    tokenizer=processor.feature_extractor
)

trainer.train()

# 5. Save adapter
model.save_pretrained("./checkpoints/whisper-lora-medical-indian-final")
```

### Data collection plan

You committed to collecting Indian medical English recordings. Structure:

```
data/whisper_clips/
├── raw/
│   ├── speaker_001/
│   │   ├── clip_001.wav
│   │   ├── clip_001.txt          # transcription
│   │   ├── clip_002.wav
│   │   └── ...
│   ├── speaker_002/
│   └── ...
├── train.json                     # list of {audio, transcription}
└── test.json
```

Scripts to read: prescription dictations, patient histories, symptom descriptions in code-mixed Hindi-English.

Target: 100-200 clips, 10-30s each, 10+ speakers with varied accents.

### Convert LoRA adapter for production inference

`faster-whisper` doesn't directly load PEFT adapters. Workflow:
1. Train LoRA adapter with HuggingFace `transformers`
2. Merge adapter into base model: `model.merge_and_unload()`
3. Save merged model in HF format
4. Convert to CTranslate2: `ct2-transformers-converter --model ./merged-whisper --output_dir ./whisper-medical-ct2`
5. Load merged CT2 model in production: `WhisperModel("./whisper-medical-ct2", ...)`

### Endpoint

```python
# src/api/routes/transcribe.py
from fastapi import APIRouter, UploadFile, File, Form
from src.models import whisper_service
import tempfile

router = APIRouter()

@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("en")
):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp.flush()
        result = whisper_service.transcribe(tmp.name, language=language)
    return result
```

### Streaming (optional, for live UX)

For real-time transcription, use WebSocket:

```python
@router.websocket("/transcribe-stream")
async def transcribe_stream(websocket: WebSocket):
    await websocket.accept()
    buffer = b""
    while True:
        chunk = await websocket.receive_bytes()
        buffer += chunk
        if len(buffer) > 16000 * 2 * 3:        # 3 seconds of 16kHz 16-bit audio
            # Save buffer to temp file, transcribe, send back partial result
            # ...
            buffer = buffer[-16000:]            # keep 1 second overlap
```

---

## 3.3 Clinical NER Pipeline

### Architecture

```
Free text → BioBERT NER → Negation Detection → Temporal Extraction → UMLS Linking → Structured output
```

### Stage 1: Pre-trained NER first (get something working)

Use `samrawal/bert-base-uncased_clinical-ner` directly via HF pipeline. Works out of the box, no training needed.

```python
# src/models/ner_service.py
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
import spacy
from negspacy.negation import Negex

_ner_pipeline = None
_spacy_nlp = None

def init():
    global _ner_pipeline, _spacy_nlp
    
    # Clinical NER
    tokenizer = AutoTokenizer.from_pretrained("samrawal/bert-base-uncased_clinical-ner")
    model = AutoModelForTokenClassification.from_pretrained("samrawal/bert-base-uncased_clinical-ner")
    _ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, 
                             aggregation_strategy="simple", device=0)
    
    # SpaCy for negation + sentence splitting
    _spacy_nlp = spacy.load("en_core_sci_sm")
    _spacy_nlp.add_pipe("negex", config={"ent_types": ["PROBLEM", "TEST", "TREATMENT"]})
```

### Stage 2: Fine-tune BioClinicalBERT on i2b2 (research contribution)

Once i2b2 DUA approved, fine-tune `emilyalsentzer/Bio_ClinicalBERT`:

```python
# src/training/train_ner.py
from transformers import (
    AutoTokenizer, 
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from datasets import load_dataset

model_name = "emilyalsentzer/Bio_ClinicalBERT"
tokenizer = AutoTokenizer.from_pretrained(model_name)

# i2b2 labels (after data preprocessing): O, B-PROBLEM, I-PROBLEM, B-TEST, I-TEST, B-TREATMENT, I-TREATMENT
label_list = ["O", "B-PROBLEM", "I-PROBLEM", "B-TEST", "I-TEST", "B-TREATMENT", "I-TREATMENT"]
label2id = {l: i for i, l in enumerate(label_list)}
id2label = {i: l for l, i in label2id.items()}

model = AutoModelForTokenClassification.from_pretrained(
    model_name, num_labels=len(label_list), id2label=id2label, label2id=label2id
)

# Load preprocessed i2b2 (you'll need to write the preprocessing — i2b2 format is XML)
dataset = load_dataset("json", data_files={"train": "data/i2b2/train.json", "test": "data/i2b2/test.json"})

def tokenize_and_align(examples):
    tokenized = tokenizer(examples["tokens"], truncation=True, is_split_into_words=True)
    labels = []
    for i, label in enumerate(examples["ner_tags"]):
        word_ids = tokenized.word_ids(batch_index=i)
        previous_word_id = None
        label_ids = []
        for word_id in word_ids:
            if word_id is None:
                label_ids.append(-100)
            elif word_id != previous_word_id:
                label_ids.append(label[word_id])
            else:
                label_ids.append(-100)              # only label first subtoken
            previous_word_id = word_id
        labels.append(label_ids)
    tokenized["labels"] = labels
    return tokenized

tokenized_data = dataset.map(tokenize_and_align, batched=True)

args = TrainingArguments(
    output_dir="./checkpoints/clinicalbert-ner",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    num_train_epochs=5,
    weight_decay=0.01,
    eval_strategy="epoch",
    fp16=True
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=tokenized_data["train"],
    eval_dataset=tokenized_data["test"],
    tokenizer=tokenizer,
    data_collator=DataCollatorForTokenClassification(tokenizer)
)

trainer.train()
trainer.save_model("./checkpoints/clinicalbert-ner-final")
```

### Stage 3: scispacy UMLS linking

This is the normalization layer. "Shortness of breath" and "dyspnea" both map to UMLS CUI C0013404.

```python
# src/data/umls_linker.py
import spacy
import scispacy
from scispacy.linking import EntityLinker

_umls_nlp = None

def init():
    global _umls_nlp
    _umls_nlp = spacy.load("en_core_sci_lg")
    _umls_nlp.add_pipe(
        "scispacy_linker",
        config={
            "resolve_abbreviations": True,
            "linker_name": "umls",
            "threshold": 0.85
        }
    )

def link_to_umls(text: str) -> list:
    doc = _umls_nlp(text)
    results = []
    for ent in doc.ents:
        if ent._.kb_ents:
            cui, score = ent._.kb_ents[0]
            results.append({
                "text": ent.text,
                "start": ent.start_char,
                "end": ent.end_char,
                "cui": cui,
                "score": score
            })
    return results
```

### The complete NER pipeline

```python
# src/pipelines/symptom_pipeline.py
import re
from datetime import datetime

def extract_temporal_modifiers(text: str, entity_span: tuple) -> dict:
    """Extract duration/timing near an entity."""
    # Window of ±50 chars around entity
    window_start = max(0, entity_span[0] - 50)
    window_end = min(len(text), entity_span[1] + 50)
    window = text[window_start:window_end]
    
    patterns = [
        (r"(\d+)\s*(day|days|week|weeks|month|months|year|years)", "duration"),
        (r"(since|for)\s+(\d+)\s*(day|days|week|weeks)", "duration"),
        (r"(this morning|last night|yesterday|today)", "onset"),
        (r"on (\w+ \d+|\d+/\d+/\d+)", "specific_date")
    ]
    
    extracted = {}
    for pattern, kind in patterns:
        match = re.search(pattern, window, re.IGNORECASE)
        if match:
            extracted[kind] = match.group(0)
    return extracted

def process_clinical_text(text: str) -> dict:
    # 1. NER
    raw_entities = ner_service.extract_entities(text)
    
    # 2. Negation via spaCy/negspacy
    doc = ner_service._spacy_nlp(text)
    negated_spans = {(e.start_char, e.end_char) for e in doc.ents if e._.negex}
    
    # 3. Process each entity
    enriched = []
    for ent in raw_entities:
        is_negated = any(
            ent['start'] >= ns and ent['end'] <= ne 
            for ns, ne in negated_spans
        )
        
        temporal = extract_temporal_modifiers(text, (ent['start'], ent['end']))
        
        # 4. UMLS linking
        umls = umls_linker.link_to_umls(ent['word'])
        cui = umls[0]['cui'] if umls else None
        
        enriched.append({
            "raw_text": ent['word'],
            "category": ent['entity_group'],          # PROBLEM, TEST, TREATMENT
            "cui": cui,
            "negated": is_negated,
            "temporal": temporal,
            "confidence": ent['score']
        })
    
    return {
        "input_text": text,
        "entities": enriched
    }
```

### Endpoint

```python
# src/api/routes/ner.py
from fastapi import APIRouter
from pydantic import BaseModel
from src.pipelines.symptom_pipeline import process_clinical_text

router = APIRouter()

class NERInput(BaseModel):
    text: str

@router.post("/ner")
async def extract_entities(input: NERInput):
    return process_clinical_text(input.text)
```

---

## 3.4 Differential Diagnosis Classifier

### DDXPlus preprocessing

```python
# src/training/preprocess_ddxplus.py
import pandas as pd
import json

# DDXPlus comes as CSVs: train.csv, validate.csv, test.csv
# Each row: PATIENT_ID, AGE, SEX, PATHOLOGY, EVIDENCES, INITIAL_EVIDENCE, DIFFERENTIAL_DIAGNOSIS

train = pd.read_csv("data/ddxplus/release_train_patients.csv")

# Build vocabulary
all_evidences = set()
all_pathologies = set()
for _, row in train.iterrows():
    evidences = eval(row['EVIDENCES'])           # list of evidence codes
    all_evidences.update(evidences)
    all_pathologies.add(row['PATHOLOGY'])

evidence_to_idx = {e: i for i, e in enumerate(sorted(all_evidences))}
pathology_to_idx = {p: i for i, p in enumerate(sorted(all_pathologies))}

# Save vocabularies
with open("data/ddxplus/evidence_vocab.json", "w") as f:
    json.dump(evidence_to_idx, f)
with open("data/ddxplus/pathology_vocab.json", "w") as f:
    json.dump(pathology_to_idx, f)

# Build feature matrix
import numpy as np

def encode(df):
    X = np.zeros((len(df), len(evidence_to_idx) + 2))   # +2 for age, sex
    y = np.zeros(len(df), dtype=int)
    
    for i, row in df.iterrows():
        for evidence in eval(row['EVIDENCES']):
            if evidence in evidence_to_idx:
                X[i, evidence_to_idx[evidence]] = 1
        X[i, -2] = row['AGE'] / 100                     # normalize
        X[i, -1] = 1 if row['SEX'] == 'M' else 0
        y[i] = pathology_to_idx[row['PATHOLOGY']]
    
    return X, y

X_train, y_train = encode(train)
np.savez("data/ddxplus/train.npz", X=X_train, y=y_train)
# Same for val, test
```

### Path A: XGBoost baseline

```python
# src/training/train_classifier.py
import numpy as np
import xgboost as xgb
from sklearn.calibration import CalibratedClassifierCV
import joblib

train_data = np.load("data/ddxplus/train.npz")
val_data = np.load("data/ddxplus/val.npz")

base_model = xgb.XGBClassifier(
    n_estimators=400,
    max_depth=6,
    learning_rate=0.05,
    objective='multi:softprob',
    tree_method='hist',
    device='cuda',
    n_jobs=-1
)

# Calibration is critical
model = CalibratedClassifierCV(base_model, method='isotonic', cv=5)
model.fit(train_data['X'], train_data['y'])

# Save
joblib.dump(model, "checkpoints/xgb_ddxplus_calibrated.joblib")
```

### Path B: BERT classifier (the harder, more impressive one)

Templated text from structured evidence:

```python
# src/training/templates.py
def evidence_to_narrative(row, evidence_descriptions, pathologies):
    age = row['AGE']
    sex = "male" if row['SEX'] == 'M' else "female"
    evidences = eval(row['EVIDENCES'])
    
    initial = evidence_descriptions[row['INITIAL_EVIDENCE']]
    other_evidences = [evidence_descriptions[e] for e in evidences if e != row['INITIAL_EVIDENCE']]
    
    text = f"Patient is a {age}-year-old {sex} presenting with {initial}. "
    if other_evidences:
        text += "Additional findings include: " + ", ".join(other_evidences) + "."
    
    return text
```

Train BERT for multi-class classification (49 pathology classes):

```python
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    Trainer, TrainingArguments
)

model_name = "emilyalsentzer/Bio_ClinicalBERT"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name, num_labels=49
)

# Standard HF training loop, similar to NER training
```

### India-prevalence reweighting

```python
# src/data/india_disease_weights.py
INDIA_PREVALENCE_RATIOS = {
    # ratios vs Western average (rough estimates from ICMR data)
    "Tuberculosis": 4.0,
    "Dengue fever": 8.0,
    "Typhoid fever": 6.0,
    "Malaria": 3.5,
    "Hepatitis A": 2.5,
    "Hepatitis B": 2.0,
    "Acute gastroenteritis": 2.0,
    "Pneumonia (bacterial)": 1.5,
    
    # Western-overrepresented (downweight)
    "Lyme disease": 0.1,
    "Allergic rhinitis": 0.7,
    "Influenza": 0.8,
    # ...
}

def reweight_probabilities(raw_probs: dict) -> dict:
    """Apply India-prevalence Bayesian reweighting."""
    weighted = {}
    for disease, prob in raw_probs.items():
        ratio = INDIA_PREVALENCE_RATIOS.get(disease, 1.0)
        weighted[disease] = prob * ratio
    
    total = sum(weighted.values())
    return {d: p / total for d, p in weighted.items()}
```

### Red flag detector

```python
# src/data/red_flags.py
RED_FLAGS = {
    "cardiac_emergency": {
        "patterns": [
            ["chest pain", "radiating", "arm"],
            ["chest pain", "sweating"],
            ["chest pain", "dyspnea", "older than 40"],
            ["crushing chest pain"]
        ],
        "alert": "Possible acute coronary syndrome. Consider ECG, troponin, urgent cardiology referral."
    },
    "stroke": {
        "patterns": [
            ["sudden weakness", "one side"],
            ["facial droop"],
            ["slurred speech"],
            ["sudden vision loss"]
        ],
        "alert": "Possible stroke. Time-critical. Consider immediate CT scan."
    },
    "sepsis": {
        "patterns": [
            ["fever", "confusion", "hypotension"],
            ["high fever", "rapid breathing", "altered mental status"]
        ],
        "alert": "Possible sepsis. Consider blood cultures, lactate, immediate IV antibiotics."
    },
    "anaphylaxis": {
        "patterns": [
            ["throat swelling"],
            ["tongue swelling", "difficulty breathing"],
            ["hives", "wheezing", "after medication"]
        ],
        "alert": "Possible anaphylaxis. Immediate epinephrine indicated."
    },
    # ... ~15 categories total
}

def detect_red_flags(entities: list, age: int = None) -> list:
    entity_texts = {e['raw_text'].lower() for e in entities if not e['negated']}
    triggered = []
    
    for category, config in RED_FLAGS.items():
        for pattern in config['patterns']:
            if all(any(p.lower() in et for et in entity_texts) for p in pattern):
                triggered.append({
                    "category": category,
                    "alert": config['alert'],
                    "matched_pattern": pattern
                })
                break
    
    return triggered
```

### Diagnosis endpoint

```python
# src/api/routes/diagnose.py
from fastapi import APIRouter
from pydantic import BaseModel
from src.models import classifier_service
from src.data import india_disease_weights, red_flags

router = APIRouter()

class DiagnoseInput(BaseModel):
    entities: list                          # output from /ner
    age: int
    sex: str

@router.post("/diagnose")
async def diagnose(input: DiagnoseInput):
    # 1. Convert entities to evidence vector
    evidence_vector = classifier_service.entities_to_evidence_vector(input.entities)
    
    # 2. Get raw probabilities (try BERT first, fall back to XGBoost)
    raw_probs = classifier_service.predict(evidence_vector, input.age, input.sex)
    
    # 3. India reweighting
    weighted_probs = india_disease_weights.reweight_probabilities(raw_probs)
    
    # 4. Top-K
    top_3 = sorted(weighted_probs.items(), key=lambda x: -x[1])[:3]
    
    # 5. Red flags
    flags = red_flags.detect_red_flags(input.entities, input.age)
    
    return {
        "top_diagnoses": [
            {"condition": d, "icd10": classifier_service.condition_to_icd10(d), "confidence": p}
            for d, p in top_3
        ],
        "red_flags": flags,
        "is_calibrated": True,
        "model_used": classifier_service.active_model_name()
    }
```

### Evaluation

```python
# src/training/evaluation/evaluate_classifier.py
import numpy as np
from sklearn.metrics import top_k_accuracy_score, brier_score_loss

def evaluate(model, X_test, y_test):
    probs = model.predict_proba(X_test)
    
    results = {
        "top_1_accuracy": top_k_accuracy_score(y_test, probs, k=1),
        "top_3_accuracy": top_k_accuracy_score(y_test, probs, k=3),
        "top_5_accuracy": top_k_accuracy_score(y_test, probs, k=5),
        "brier_score": np.mean([
            brier_score_loss((y_test == i).astype(int), probs[:, i])
            for i in range(probs.shape[1])
        ]),
        # Per-disease F1
        "per_disease_metrics": compute_per_class_f1(y_test, np.argmax(probs, axis=1))
    }
    return results
```

Run on India-prevalent diseases specifically as a sub-evaluation. Report ECE (Expected Calibration Error) alongside accuracy.

---

## 3.5 LLM Patient Summary Generation

### The prompt

```python
# src/models/llm_service.py
import anthropic
from typing import Dict

_client = None

def init():
    global _client
    _client = anthropic.Anthropic()

SUMMARY_SYSTEM_PROMPT = """You are a medical summarization assistant. Given structured patient data, write a 2-3 sentence clinical summary for the consulting doctor. Be factual, concise, and clinically meaningful. Focus on: demographic, active conditions and medications with duration, recent lab trends (if abnormal or noteworthy), adherence concerns, and current presenting concern (if provided). 

Do not invent information. Do not provide diagnostic opinions. Do not exceed 3 sentences. Use medical abbreviations sparingly (T2DM, HTN are OK; obscure ones are not).

Output format: plain text paragraph only, no markdown, no list."""

def generate_patient_summary(patient_data: Dict) -> str:
    # Structure the input cleanly
    user_prompt = f"""
Patient: {patient_data['age']}-year-old {patient_data['sex']}
Allergies: {', '.join(a['allergen'] for a in patient_data['allergies']) or 'None known'}
Chronic conditions: {', '.join(f"{c['displayName']} (since {c['diagnosedAt'].year})" for c in patient_data['chronicConditions']) or 'None'}

Active medications:
{format_medications(patient_data['activeMedications'])}

Recent lab trends:
{format_lab_trends(patient_data['labTrends'])}

Adherence score: {patient_data['stats']['adherence']['score']} ({patient_data['stats']['adherence']['gaps']} refill gaps in last 6 months)

Visits: {patient_data['stats']['totalVisits']} total, last visit {format_date(patient_data['stats']['lastVisitAt'])}

Current presenting concern (if any): {patient_data.get('currentSymptoms', 'Not yet documented')}
"""
    
    response = _client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=200,
        system=SUMMARY_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}]
    )
    
    return response.content[0].text.strip()
```

### Endpoint

```python
# src/api/routes/summarize.py
@router.post("/summarize/patient")
async def summarize_patient(input: PatientDataInput):
    cache_key = f"summary:{input.patient_id}"
    cached = await redis.get(cache_key)
    if cached:
        return {"summary": cached.decode()}
    
    summary = llm_service.generate_patient_summary(input.dict())
    await redis.setex(cache_key, 600, summary)        # 10 min cache
    
    return {"summary": summary}
```

Caching is critical. LLM calls are expensive, summary doesn't change minute-to-minute.

---

## 3.6 Symptom Recurrence Matcher

When patient presents with new symptoms, check if they've presented similarly before.

### Approach: vector similarity

```python
# src/models/embedding_service.py
from sentence_transformers import SentenceTransformer
import numpy as np

_embedder = None

def init():
    global _embedder
    # Use a biomedical sentence embedder
    _embedder = SentenceTransformer('pritamdeka/S-PubMedBert-MS-MARCO')

def embed_symptom_set(entities: list) -> np.ndarray:
    """Convert a list of symptom entities into a single vector."""
    # Build a canonical text representation
    pos_symptoms = [e['raw_text'] for e in entities if not e['negated']]
    text = ", ".join(pos_symptoms) if pos_symptoms else "no symptoms"
    
    embedding = _embedder.encode(text, normalize_embeddings=True)
    return embedding
```

### Storage

Store symptom embeddings per past visit. Use FAISS for fast similarity search:

```python
# src/services/recurrence_service.py
import faiss
import numpy as np

class PatientRecurrenceIndex:
    """Per-patient FAISS index of past visit symptom embeddings."""
    
    def __init__(self, patient_id):
        self.patient_id = patient_id
        self.index = None
        self.visit_metadata = []
    
    async def build(self):
        # Load all past visits with their symptom embeddings
        past_visits = await db.appointments.find({
            "patientId": self.patient_id,
            "status": "COMPLETED",
            "preVisitSymptoms.embedding": {"$exists": True}
        }).to_list(None)
        
        if not past_visits:
            return
        
        embeddings = np.array([v['preVisitSymptoms']['embedding'] for v in past_visits])
        self.index = faiss.IndexFlatIP(embeddings.shape[1])    # inner product (cosine if normalized)
        self.index.add(embeddings)
        
        self.visit_metadata = [
            {
                "visit_id": v['_id'],
                "date": v['slotStart'],
                "diagnoses": [d['displayName'] for d in (v.get('prescriptionId', {}).get('diagnosis', []))],
                "outcome": "resolved" if v.get('followUp', {}).get('type') == 'NONE' else "follow-up needed"
            }
            for v in past_visits
        ]
    
    def query(self, current_embedding, k=3, threshold=0.85):
        if not self.index:
            return []
        
        scores, indices = self.index.search(np.array([current_embedding]), k)
        matches = []
        for score, idx in zip(scores[0], indices[0]):
            if score >= threshold:
                matches.append({
                    **self.visit_metadata[idx],
                    "similarity": float(score)
                })
        return matches
```

### Endpoint

```python
# src/api/routes/recurrence.py
@router.post("/recurrence")
async def check_recurrence(input: RecurrenceInput):
    current_embedding = embedding_service.embed_symptom_set(input.current_entities)
    
    index = PatientRecurrenceIndex(input.patient_id)
    await index.build()
    
    matches = index.query(current_embedding, k=3, threshold=0.85)
    
    return {"recurring_presentations": matches}
```

---

## 3.7 Integration with Phase 2 Backend

The Node.js backend calls the Python AI service via HTTP.

### Backend AI client

```typescript
// apps/backend/src/services/ai-client.service.ts
import axios from 'axios';

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/ai';

export class AIClient {
  async transcribe(audioBuffer: Buffer, language = 'en') {
    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer]));
    formData.append('language', language);
    
    const response = await axios.post(`${AI_BASE}/transcribe`, formData);
    return response.data;
  }
  
  async extractEntities(text: string) {
    const response = await axios.post(`${AI_BASE}/ner`, { text });
    return response.data;
  }
  
  async diagnose(entities: any[], age: number, sex: string) {
    const response = await axios.post(`${AI_BASE}/diagnose`, { entities, age, sex });
    return response.data;
  }
  
  async summarizePatient(patientData: any) {
    const response = await axios.post(`${AI_BASE}/summarize/patient`, patientData);
    return response.data;
  }
  
  async checkRecurrence(patientId: string, currentEntities: any[]) {
    const response = await axios.post(`${AI_BASE}/recurrence`, {
      patient_id: patientId,
      current_entities: currentEntities
    });
    return response.data;
  }
}
```

### Pre-visit symptom processing

Update Phase 2's appointment flow:

```typescript
// services/appointment.service.ts
async function processPreVisitSymptoms(appointmentId: string, audioOrText: AudioOrText) {
  let text = audioOrText.text;
  
  if (audioOrText.audio) {
    const result = await aiClient.transcribe(audioOrText.audio);
    text = result.text;
  }
  
  // Extract entities
  const ner = await aiClient.extractEntities(text);
  
  // Get diagnosis suggestions
  const patient = await Patient.findById(/* ... */);
  const diagnosis = await aiClient.diagnose(
    ner.entities, 
    computeAge(patient.dateOfBirth), 
    patient.sex
  );
  
  // Save
  await Appointment.updateOne(
    { _id: appointmentId },
    {
      'preVisitSymptoms.rawText': text,
      'preVisitSymptoms.audioUrl': audioOrText.audioUrl,
      'preVisitSymptoms.extractedEntities': ner.entities,
      'preVisitSymptoms.aiTop3Diagnoses': diagnosis.top_diagnoses,
      'preVisitSymptoms.redFlags': diagnosis.red_flags
    }
  );
}
```

### Patient summary integration

Update Phase 2's `buildPatientSummary` to call AI:

```typescript
async function buildPatientSummary(patientId, viewerDoctorId) {
  // ... Phase 2 base summary ...
  
  // Phase 3 additions
  const aiSummary = await aiClient.summarizePatient({
    age: computeAge(patient.dateOfBirth),
    sex: patient.sex,
    allergies: patient.allergies,
    chronicConditions: patient.chronicConditions,
    activeMedications: patient.activeMedications,
    labTrends: summary.labTrends,
    stats: summary.stats,
    currentSymptoms: latestAppointment?.preVisitSymptoms?.rawText
  });
  
  summary.aiSummaryParagraph = aiSummary.summary;
  
  // Symptom recurrence (only if current symptoms exist)
  if (latestAppointment?.preVisitSymptoms?.extractedEntities) {
    const recurrence = await aiClient.checkRecurrence(
      patientId,
      latestAppointment.preVisitSymptoms.extractedEntities
    );
    summary.symptomRecurrence = recurrence.recurring_presentations;
  }
  
  return summary;
}
```

---

## 3.8 Evaluation Suite (For Your Paper)

Build a comprehensive evaluation script that produces all the numbers your paper needs:

```python
# src/training/evaluation/full_eval.py
def run_full_evaluation():
    results = {}
    
    # NER metrics
    results['ner'] = evaluate_ner_on_i2b2_test()
    # entity-level F1 per category, negation F1
    
    # Classifier metrics  
    results['classifier'] = evaluate_classifier_on_ddxplus_test()
    # top-1, top-3, top-5, brier, ECE, per-disease F1
    
    # Classifier on India-prevalent subset
    results['classifier_india'] = evaluate_classifier_on_india_subset()
    
    # Calibration before/after Platt scaling
    results['calibration'] = compare_calibration()
    
    # Whisper WER
    results['whisper'] = {
        'baseline_wer': evaluate_whisper_baseline(),
        'lora_wer': evaluate_whisper_lora(),
        'medical_terms_wer': evaluate_on_medical_vocabulary(),
        'drug_names_wer': evaluate_on_drug_names()
    }
    
    # Red flag detection
    results['red_flags'] = evaluate_red_flag_recall()
    
    # End-to-end pipeline (synthetic patient narratives)
    results['end_to_end'] = evaluate_full_pipeline()
    
    # Latency benchmarks
    results['latency'] = benchmark_latencies()
    
    save_to_json("evaluation_results.json", results)
    generate_paper_tables(results)
```

---

## 3.9 Checklist — Definition of Done for Phase 3

- [ ] FastAPI service running on port 8000
- [ ] faster-whisper transcribing audio in <5s for 30s clips on GPU
- [ ] Whisper LoRA adapter trained and merged into production model
- [ ] WER measurable on test set, improvement over baseline documented
- [ ] BioClinicalBERT NER fine-tuned on i2b2, F1 > 0.80
- [ ] Negation detection working (negated entities tagged correctly)
- [ ] scispacy UMLS linking returning CUIs for symptoms
- [ ] DDXPlus XGBoost classifier trained with Platt calibration
- [ ] DDXPlus ClinicalBERT classifier trained (paper comparison)
- [ ] India-prevalence reweighting applied to outputs
- [ ] Red flag detector catching all hardcoded patterns
- [ ] LLM patient summary generating sensible paragraphs
- [ ] Symptom recurrence matcher returning past similar presentations
- [ ] Backend integration: AI client calling all 5 AI endpoints
- [ ] Pre-visit symptom intake working end-to-end (patient records → text → entities → diagnosis suggestions stored on appointment)
- [ ] Patient summary in dashboard includes LLM paragraph and recurrence info
- [ ] Full evaluation script runs and produces paper-ready metrics

When you can demo: patient speaks symptoms in Hindi-English → Whisper transcribes → NER extracts entities → classifier suggests top-3 diagnoses → red flags shown → doctor opens patient → sees LLM summary at top → sees that this patient had similar symptoms 6 months ago — Phase 3 is done.

---

## Parallel Work to Continue

- Phase 4: continue collecting handwritten prescription samples, start annotating regions in Label Studio
- Phase 5: build UI components in isolation using Storybook with mock data
