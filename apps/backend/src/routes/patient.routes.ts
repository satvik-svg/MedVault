import { Router, type Router as RouterType } from 'express'
import { getProfile, updateProfile } from '../controllers/patient.controller.ts'
import { authenticate } from '../middleware/index.ts'
import { buildPatientSummary, buildPatientTimeline } from '../services/patient-summary.service.ts'
import { listPatientPrescriptions } from '../services/prescription.service.ts'
import { listPatientLabReports } from '../services/lab.service.ts'
import { resolveConsentRequest } from '../services/consent.service.ts'
import { generateEmergencyQR } from '../services/emergency-qr.service.ts'
import { EmergencyQR } from '../models/EmergencyQR.ts'

const router: RouterType = Router()

router.use(authenticate)

router.get('/profile', getProfile)
router.post('/profile', updateProfile)
router.get('/me', getProfile)
router.patch('/me', updateProfile)

router.get('/prescriptions', async (req, res) => {
  try {
    const prescriptions = await listPatientPrescriptions(req.user?.patientId || '')
    res.json(prescriptions)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch prescriptions' })
  }
})

router.get('/prescriptions/active', async (req, res) => {
  try {
    const summary = await buildPatientSummary(req.user?.patientId || '')
    const patient = summary.patient as { activeMedications?: unknown[] }
    res.json(patient.activeMedications || [])
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch active medications' })
  }
})

router.get('/lab-reports', async (req, res) => {
  try {
    const reports = await listPatientLabReports(req.user?.patientId || '')
    res.json(reports)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch lab reports' })
  }
})

router.get('/timeline', async (req, res) => {
  try {
    const timeline = await buildPatientTimeline(req.user?.patientId || '', {
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      types: req.query.types ? String(req.query.types).split(',') : undefined,
    })
    res.json(timeline)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch timeline' })
  }
})

router.get('/summary', async (req, res) => {
  try {
    const summary = await buildPatientSummary(req.user?.patientId || '')
    res.json(summary)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch summary' })
  }
})

router.post('/consent-requests/:id/resolve', async (req, res) => {
  try {
    const result = await resolveConsentRequest(req.params.id, req.user?.patientId || '', !!req.body.approved)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to resolve consent request' })
  }
})

router.get('/qr/emergency', async (req, res) => {
  try {
    const activeQr = await EmergencyQR.findOne({ patientId: req.user?.patientId, status: 'ACTIVE' }).sort({ createdAt: -1 })
    if (activeQr) {
      res.json(activeQr)
      return
    }
    const generatedQr = await generateEmergencyQR(req.user?.patientId || '')
    res.json(generatedQr)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch emergency QR' })
  }
})

export default router
