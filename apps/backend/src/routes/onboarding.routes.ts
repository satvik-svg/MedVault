import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import {
  completePatientQuickRegister,
  initiatePatientQuickRegister,
  onboardDoctorByAdmin,
  onboardLabByAdmin,
  sendDoctorCredentials,
  sendLabCredentials,
} from '../services/onboarding.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.post('/doctor', requireRole('PLATFORM_ADMIN'), async (req, res) => {
  try {
    const result = await onboardDoctorByAdmin(req.body, req.user!.userId)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Doctor onboarding failed' })
  }
})

router.post('/doctor/:id/send-credentials', requireRole('PLATFORM_ADMIN'), async (req, res) => {
  try {
    const result = await sendDoctorCredentials(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Credential send failed' })
  }
})

router.post('/lab', requireRole('PLATFORM_ADMIN'), async (req, res) => {
  try {
    const result = await onboardLabByAdmin(req.body, req.user!.userId)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab onboarding failed' })
  }
})

router.post('/lab/:id/send-credentials', requireRole('PLATFORM_ADMIN'), async (req, res) => {
  try {
    const result = await sendLabCredentials(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Credential send failed' })
  }
})

router.post('/patient/initiate', requireRole('DOCTOR', 'PLATFORM_ADMIN'), async (req, res) => {
  try {
    const result = await initiatePatientQuickRegister(req.body.phoneNumber)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Patient quick registration failed' })
  }
})

router.post('/patient/complete', requireRole('DOCTOR', 'PLATFORM_ADMIN'), async (req, res) => {
  try {
    const result = await completePatientQuickRegister(req.body, req.user!.userId)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Patient quick registration failed' })
  }
})

export default router
