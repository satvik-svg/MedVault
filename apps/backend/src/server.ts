import express, { type Express } from 'express'
import cors from 'cors'
import { config, connectDatabase } from './config/index.ts'
import { generalRateLimiter } from './middleware/rateLimiter.ts'
import {
  authRoutes,
  patientRoutes,
  doctorRoutes,
  adminRoutes,
  onboardingRoutes,
  visitRoutes,
  labOrderRoutes,
  labReportRoutes,
  prescriptionRoutes,
  labRoutes,
  verifyRoutes,
} from './routes/index.ts'

const app: Express = express()
let databaseReady = false
let databaseStartupError: string | null = null

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Middleware
app.use(cors())
app.use(express.json())
app.use(generalRateLimiter)

// Health check
app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>MedVault API</title></head>
  <body>
    <h1>MedVault API is running</h1>
    <p>This is the backend service. Open the frontend at <a href="http://127.0.0.1:3000/">http://127.0.0.1:3000/</a>.</p>
    <p>API health check: <a href="/api/health">/api/health</a></p>
  </body>
</html>`)
})

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: databaseReady ? 'connected' : 'starting',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/ready', (_req, res) => {
  if (!databaseReady) {
    res.status(503).json({
      status: 'starting',
      database: 'not_connected',
      error: databaseStartupError,
    })
    return
  }

  res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() })
})

app.use((_req, res, next) => {
  if (!databaseReady) {
    res.status(503).json({ error: 'Service is starting. Please try again shortly.' })
    return
  }

  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/patient', patientRoutes)
app.use('/api/doctor', doctorRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/visits', visitRoutes)
app.use('/api/lab-orders', labOrderRoutes)
app.use('/api/lab-reports', labReportRoutes)
app.use('/api/prescriptions', prescriptionRoutes)
app.use('/api/lab', labRoutes)
app.use('/verify', verifyRoutes)

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Unhandled request error:', err)
  if (res.headersSent) {
    next(err)
    return
  }

  res.status(500).json({ error: 'Internal server error' })
})

// Start server
async function start(): Promise<void> {
  if (!config.database.url) {
    console.error('[Server] DATABASE_URL or POSTGRES_URL is required for Neon Postgres')
    process.exit(1)
  }

  app.listen(config.port, () => {
    console.log(`[Server] MedVault API running on port ${config.port}`)
    console.log(`[Server] Environment: ${config.nodeEnv}`)
    if (config.isDev) {
      console.log(`[Server] ABDM Mock: ${config.abdm.useMock ? 'enabled' : 'disabled'}`)
    }
  })

  let attempt = 0
  while (!databaseReady) {
    try {
      await connectDatabase()
      databaseReady = true
      databaseStartupError = null
    } catch (error) {
      attempt += 1
      databaseStartupError = error instanceof Error ? error.message : 'Database connection failed'
      const delayMs = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5))
      console.error(`[Server] Database connection attempt ${attempt} failed. Retrying in ${delayMs}ms.`)
      await sleep(delayMs)
    }
  }
}

start().catch((error) => {
  console.error('[Server] Failed to start:', error)
  process.exit(1)
})

export default app
