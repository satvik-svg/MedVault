import express, { type Express } from 'express'
import cors from 'cors'
import { config, connectDatabase } from './config/index.ts'
import { generalRateLimiter } from './middleware/rateLimiter.ts'
import {
  authRoutes,
  patientRoutes,
  clinicRoutes,
  doctorRoutes,
  adminRoutes,
  onboardingRoutes,
  visitRoutes,
  labOrderRoutes,
  prescriptionRoutes,
  labRoutes,
  emergencyQrRoutes,
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
app.use('/api/clinic', clinicRoutes)
app.use('/api/doctor', doctorRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/visits', visitRoutes)
app.use('/api/lab-orders', labOrderRoutes)
app.use('/api/prescriptions', prescriptionRoutes)
app.use('/api/lab', labRoutes)
app.use('/api/emergency-qr', emergencyQrRoutes)
app.use('/verify', verifyRoutes)

// Health check
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
