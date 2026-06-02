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

// Middleware
app.use(cors())
app.use(express.json())
app.use(generalRateLimiter)

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
async function start(): Promise<void> {
  await connectDatabase()

  app.listen(config.port, () => {
    console.log(`[Server] MedVault API running on port ${config.port}`)
    console.log(`[Server] Environment: ${config.nodeEnv}`)
    if (config.isDev) {
      console.log(`[Server] ABDM Mock: ${config.abdm.useMock ? 'enabled' : 'disabled'}`)
    }
  })
}

start().catch((error) => {
  console.error('[Server] Failed to start:', error)
  process.exit(1)
})

export default app
