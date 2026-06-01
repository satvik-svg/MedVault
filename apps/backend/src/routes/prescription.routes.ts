import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import { searchDrugs } from '../services/drug-lookup.service.ts'
import {
  checkMedicationForPrescription,
  createPrescription,
  listPatientPrescriptions,
  SafetyCheckError,
} from '../services/prescription.service.ts'
import { verifyPrescriptionAnchoring } from '../services/blockchain-verification.service.ts'
import { confirmExternalPrescription, uploadExternalPrescription } from '../services/external-prescription.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.get('/drugs/search', async (req, res) => {
  try {
    const results = await searchDrugs(String(req.query.q || ''), Number(req.query.limit || 10))
    res.json(results)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Drug search failed' })
  }
})

router.post('/check-medication', requireRole('DOCTOR'), async (req, res) => {
  try {
    const result = await checkMedicationForPrescription(req.body.patientId, req.body.medication)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Safety check failed' })
  }
})

router.post('/', requireRole('DOCTOR'), async (req, res) => {
  try {
    if (!req.user) throw new Error('Unauthenticated')
    const prescription = await createPrescription(req.body, req.user)
    res.status(201).json(prescription)
  } catch (error) {
    const status = error instanceof SafetyCheckError ? 409 : 400
    res.status(status).json({
      error: error instanceof Error ? error.message : 'Prescription creation failed',
      code: error instanceof SafetyCheckError ? error.code : undefined,
      details: error instanceof SafetyCheckError ? error.details : undefined,
    })
  }
})

router.get('/patient/:patientId', async (req, res) => {
  try {
    const patientId = req.user?.role === 'PATIENT' ? req.user.patientId : req.params.patientId
    const prescriptions = await listPatientPrescriptions(String(patientId))
    res.json(prescriptions)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list prescriptions' })
  }
})

router.get('/:id/verify', async (req, res) => {
  try {
    const result = await verifyPrescriptionAnchoring(req.params.id, req.user?.userId)
    res.json(result)
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Verification failed' })
  }
})

router.post('/external', requireRole('PATIENT'), async (req, res) => {
  try {
    const result = await uploadExternalPrescription({
      patientId: req.user?.patientId || req.body.patientId,
      uploadedByUserId: req.user?.userId || '',
      imageBase64: req.body.imageBase64,
      sourceImageUrl: req.body.sourceImageUrl,
    })
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'External prescription upload failed' })
  }
})

router.post('/external/:id/confirm', requireRole('PATIENT'), async (req, res) => {
  try {
    const result = await confirmExternalPrescription({
      prescriptionId: req.params.id,
      patientId: req.user?.patientId || '',
      medications: req.body.medications || [],
    })
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'External prescription confirmation failed' })
  }
})

export default router
