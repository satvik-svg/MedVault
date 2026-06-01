import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import { generateEmergencyQR, GeoAnomalyError, revokeEmergencyQR, scanEmergencyQR } from '../services/emergency-qr.service.ts'
import { EmergencyQR } from '../models/EmergencyQR.ts'

const router: RouterType = Router()

router.post('/scan', async (req, res) => {
  try {
    const result = await scanEmergencyQR({
      signedPayload: req.body.signedPayload,
      scannerLocation: req.body.scannerLocation,
      scannerIp: req.ip,
      facilityName: req.body.facilityName,
      userId: req.user?.userId,
    })
    res.json(result)
  } catch (error) {
    const status = error instanceof GeoAnomalyError ? 403 : 400
    res.status(status).json({ error: error instanceof Error ? error.message : 'Emergency QR scan failed' })
  }
})

router.use(authenticate)

router.post('/generate', requireRole('PATIENT'), async (req, res) => {
  try {
    const qr = await generateEmergencyQR(req.user?.patientId || req.body.patientId)
    res.status(201).json(qr)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Emergency QR generation failed' })
  }
})

router.get('/active', requireRole('PATIENT'), async (req, res) => {
  try {
    const qr = await EmergencyQR.findOne({ patientId: req.user?.patientId, status: 'ACTIVE' }).sort({ createdAt: -1 })
    res.json(qr)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch QR' })
  }
})

router.post('/revoke/:nonce', requireRole('PATIENT'), async (req, res) => {
  try {
    const result = await revokeEmergencyQR(req.user?.patientId || '', req.params.nonce, req.body.reason)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Emergency QR revocation failed' })
  }
})

export default router
