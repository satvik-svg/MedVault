import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import { listPatientLabReports, saveExternalLabUpload, uploadStructuredLabReport } from '../services/lab.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.post('/upload', requireRole('LAB_OPERATOR', 'CLINIC_ADMIN'), async (req, res) => {
  try {
    const report = await uploadStructuredLabReport({
      patientId: req.body.patientId,
      labClinicId: req.body.labClinicId || req.user?.clinicId,
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
      aiConfidence: req.body.aiConfidence,
    })
    res.status(201).json(report)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'External lab upload failed' })
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
