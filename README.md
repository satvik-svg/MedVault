# MedVault

MedVault is a healthcare records platform for walk-in clinical workflows. It connects patients, doctors, lab partners, AI-assisted clinical processing, and blockchain-backed record verification in one monorepo.

The current product direction is the v2 flow:

- Patients register or quick-register during a walk-in visit.
- Doctors create visits, write prescriptions, order lab tests, and review patient summaries.
- Lab operators receive lab orders and upload reports.
- AI services support transcription, NER, diagnosis suggestions, recurrence checks, summaries, and OCR.
- Prescriptions and lab reports can be anchored through the blockchain worker for tamper-evident verification.

## Monorepo Layout

```text
apps/
  backend/                Express API, Prisma/Postgres data layer, Redis queues
  frontend/               React/Vite web app
  ai-service/             FastAPI AI service
  blockchain-worker/      BullMQ worker for blockchain anchoring
  blockchain-contracts/   Hardhat smart contracts and tests
  abdm-mock/              Local ABDM/ABHA mock service
packages/
  shared-types/           Shared TypeScript types
  shared-constants/       Shared constants
  api-contracts/          API contract package placeholder
```

## Prerequisites

- Node.js 20+ recommended
- pnpm 11+
- Python 3.11+
- Neon Postgres database
- Redis URL, local Redis, or Upstash Redis
- Sepolia RPC URL for blockchain worker

Enable pnpm if needed:

```bash
corepack enable
corepack prepare pnpm@11.5.0 --activate
```

Install JavaScript dependencies:

```bash
pnpm install
```

## Environment

Create a local env file:

```bash
cp .env.example .env
```

Required for the main local stack:

```bash
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me-32-bytes-min
JWT_REFRESH_SECRET=change-me-32-bytes-min-different
DATA_ENCRYPTION_KEY=64-hex-character-key
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

For development OTP, keep `NODE_ENV=development`. Patient OTPs are printed in the backend terminal, so Twilio credentials are not required locally.

## Database Setup

Generate Prisma client:

```bash
pnpm --filter @medvault/backend prisma:generate
```

Initialize or update the Neon schema:

```bash
pnpm --filter @medvault/backend db:init:neon
```

Optional reference-data seed:

```bash
pnpm --filter @medvault/backend seed:references
```

## Running Locally

Start everything from the repo root:

```bash
pnpm dev
```

This runs backend, frontend, ABDM mock, blockchain worker, and AI service together with prefixed logs. Stop all services with `Ctrl+C`.

Optional skips:

```bash
pnpm dev -- --no-ai
pnpm dev -- --no-worker
pnpm dev -- --no-mock
```

Or start services in separate terminals.

From the repo root, use the commands below exactly. If your terminal is already inside a package folder like `apps/backend`, either run the local script (`pnpm dev`) or add `-w` to run the root workspace script (`pnpm -w dev:backend`).

Backend API:

```bash
pnpm dev:backend
```

Default URL: `http://localhost:4000`

Frontend:

```bash
pnpm dev:frontend
```

Default URL: Vite prints it, usually `http://localhost:5173`

AI service:

```bash
cd apps/ai-service
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

ABDM mock:

```bash
pnpm dev:mock
```

Default URL: `http://localhost:5050`

Blockchain worker:

```bash
pnpm dev:blockchain-worker
```

Local Redis with Docker, if not using Upstash:

```bash
docker compose up -d
```

## Service Health Checks

Backend:

```bash
curl http://localhost:4000/api/health
```

Frontend:

Open the Vite URL in your browser.

AI service:

```bash
curl http://localhost:8000/health
```

ABDM mock:

```bash
curl http://localhost:5050/health
```

Redis:

```bash
node -e "const Redis=require('ioredis'); const r=new Redis(process.env.REDIS_URL || 'redis://localhost:6379'); r.ping().then(x=>{console.log(x); r.disconnect()})"
```

Sepolia RPC:

```bash
node -e "fetch(process.env.SEPOLIA_RPC_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]})}).then(r=>r.json()).then(console.log)"
```

Expected Sepolia chain ID: `0xaa36a7`.

## Verification Commands

Backend:

```bash
pnpm --filter @medvault/backend build
pnpm --filter @medvault/backend test
pnpm --filter @medvault/backend prisma:generate
pnpm --filter @medvault/backend prisma:validate
```

Frontend:

```bash
pnpm --filter @medvault/frontend build
```

Blockchain worker:

```bash
pnpm --filter @medvault/blockchain-worker build
```

Smart contracts:

```bash
pnpm --filter @medvault/blockchain-contracts test
```

ABDM mock:

```bash
pnpm --filter @medvault/abdm-mock build
```

AI service syntax check:

```bash
python3.11 -m compileall -q apps/ai-service/src apps/ai-service/evaluation apps/ai-service/training
```

## Common Local Flow

1. Start Redis or confirm Upstash is reachable.
2. Run `pnpm install`.
3. Run `pnpm --filter @medvault/backend prisma:generate`.
4. Run `pnpm --filter @medvault/backend db:init:neon`.
5. Start backend with `pnpm dev:backend`.
6. Start frontend with `pnpm dev:frontend`.
7. Start AI service if testing AI endpoints.
8. Start blockchain worker if testing anchoring jobs.

## Notes

- Do not commit `.env` or real credentials.
- In development, OTP values are logged in the backend terminal.
- The backend uses Prisma/Postgres. MongoDB and Mongoose are not part of the active runtime.
- The current records flow is visit-based, not appointment-based.
- Pharmacy and emergency QR flows are intentionally removed from the active product.
