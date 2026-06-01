import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import { Lab } from '../models/Lab.ts'
import { listPatientLabReports, saveExternalLabUpload, uploadStructuredLabReport } from '../services/lab.service.ts'
import { discoverLabs } from '../services/lab-discovery.service.ts'
import { getLabOrderForLab, listPendingLabOrders, updateLabOrderStatus, uploadLabOrderReport } from '../services/lab-order.service.ts'
import { verifyLabReportAnchoring } from '../services/blockchain-verification.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.get('/me', requireRole('LAB_OPERATOR'), async (req, res) => {
  try {
    const lab = await Lab.findById(req.user?.labId)
    if (!lab) throw new Error('Lab not found')
    res.json(lab)
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Lab not found' })
  }
})

router.patch('/me', requireRole('LAB_OPERATOR'), async (req, res) => {
  try {
    const allowed = ['phone', 'email', 'website', 'operatingHours', 'sampleCollectionHours', 'testsOffered', 'homeCollectionAvailable', 'homeCollectionCharge', 'homeCollectionCities']
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
    const lab = await Lab.findByIdAndUpdate(req.user?.labId, { $set: update }, { new: true, runValidators: true })
    res.json(lab)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab update failed' })
  }
})

router.get('/discover', requireRole('DOCTOR', 'PLATFORM_ADMIN'), async (req, res) => {
  try {
    if (!req.query.city) throw new Error('city is required')
    const labs = await discoverLabs({
      city: String(req.query.city),
      loincCodes: req.query.loincCodes ? String(req.query.loincCodes).split(',') : undefined,
      doctorId: req.user?.doctorId,
      openNow: req.query.openNow === 'true',
      geoNear: req.query.lat && req.query.lng ? {
        lat: Number(req.query.lat),
        lng: Number(req.query.lng),
        maxKm: Number(req.query.maxKm || 20),
      } : undefined,
    })
    res.json(labs)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab discovery failed' })
  }
})

router.get('/orders/pending', requireRole('LAB_OPERATOR'), async (req, res) => {
  try {
    const orders = await listPendingLabOrders(req.user?.labId || '')
    res.json(orders)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch lab orders' })
  }
})

router.get('/orders/:id', requireRole('LAB_OPERATOR'), async (req, res) => {
  try {
    const order = await getLabOrderForLab(req.params.id, req.user?.labId || '')
    res.json(order)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch lab order' })
  }
})

router.patch('/orders/:id/status', requireRole('LAB_OPERATOR'), async (req, res) => {
  try {
    const order = await updateLabOrderStatus(
      req.params.id,
      req.user?.labId || '',
      req.user?.userId || '',
      req.body.newStatus,
      req.body.note
    )
    res.json(order)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab order update failed' })
  }
})

router.post('/orders/:id/upload-report', requireRole('LAB_OPERATOR'), async (req, res) => {
  try {
    const report = await uploadLabOrderReport({
      orderId: req.params.id,
      labId: req.user?.labId || '',
      operatorUserId: req.user?.userId || '',
      method: req.body.method || 'STRUCTURED',
      collectionDate: req.body.collectionDate ? new Date(req.body.collectionDate) : undefined,
      reportDate: req.body.reportDate ? new Date(req.body.reportDate) : undefined,
      results: req.body.results || [],
      attachmentUrls: req.body.attachmentUrls || [],
      ocrText: req.body.ocrText,
      ocrConfidence: req.body.ocrConfidence,
    })
    res.status(201).json(report)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab report upload failed' })
  }
})

router.post('/upload', requireRole('LAB_OPERATOR'), async (req, res) => {
  try {
    const report = await uploadStructuredLabReport({
      patientId: req.body.patientId,
      labId: req.body.labId || req.user?.labId,
      operatorUserId: req.user?.userId || '',
      orderedByDoctorId: req.body.orderedByDoctorId,
      prescriptionId: req.body.prescriptionId,
      collectionDate: req.body.collectionDate ? new Date(req.body.collectionDate) : undefined,
      reportDate: new Date(req.body.reportDate),
      results: req.body.results || [],
      attachmentUrls: req.body.attachmentUrls || [],
    })
    res.status(201).json(report)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab upload failed' })
  }
})

router.post('/external', requireRole('PATIENT'), async (req, res) => {
  try {
    const report = await saveExternalLabUpload({
      patientId: req.user?.patientId || '',
      uploadedByUserId: req.user?.userId || '',
      fileUrl: req.body.fileUrl,
      fileType: req.body.fileType || 'application/octet-stream',
      reportDate: req.body.reportDate ? new Date(req.body.reportDate) : undefined,
      ocrText: req.body.ocrText,
      results: req.body.results || [],
      structuredData: req.body.structuredData,
      aiConfidence: req.body.aiConfidence,
    })
    res.status(201).json(report)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'External lab upload failed' })
  }
})

router.get('/reports/:id/verify', async (req, res) => {
  try {
    const result = await verifyLabReportAnchoring(req.params.id, req.user?.userId)
    res.json(result)
  } catch (error) {
    res.status(400).json({ verified: false, reason: error instanceof Error ? error.message : 'Verification failed' })
  }
})

router.get('/patient/:patientId', async (req, res) => {
  try {
    const patientId = req.user?.role === 'PATIENT' ? req.user.patientId : req.params.patientId
    const reports = await listPatientLabReports(String(patientId))
    res.json(reports)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list lab reports' })
  }
})

export default router
