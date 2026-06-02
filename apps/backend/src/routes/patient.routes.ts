import { Router, type Router as RouterType } from 'express'
import { getProfile, updateProfile } from '../controllers/patient.controller.ts'
import { authenticate, requireRole } from '../middleware/index.ts'
import { LabReport } from '../models/LabReport.ts'
import { Patient } from '../models/Patient.ts'
import { Visit } from '../models/Visit.ts'
import { buildPatientSummary, buildPatientTimeline } from '../services/patient-summary.service.ts'
import { listPatientPrescriptions } from '../services/prescription.service.ts'
import { listPatientLabReports } from '../services/lab.service.ts'
import { listPatientLabOrders, markPatientUsingAlternateLab } from '../services/lab-order.service.ts'
import { resolveConsentRequest } from '../services/consent.service.ts'
import { recordPreVisitSymptoms } from '../services/visit.service.ts'
import { signPayload, toQrDataUrl } from '../utils/qr.ts'
import { computeAge } from '../utils/time.ts'

const router: RouterType = Router()

router.use(authenticate)

router.get('/profile', getProfile)
router.post('/profile', updateProfile)
router.get('/me', getProfile)
router.patch('/me', updateProfile)

router.get('/me/qr', requireRole('PATIENT'), async (req, res) => {
  try {
    if (!req.user?.patientId) throw new Error('Patient profile is required')

    const patient = await Patient.findById(req.user.patientId).select('_id medvaultId abhaId fullName').lean()
    if (!patient) throw new Error('Patient not found')

    const { signedPayload, payload } = signPayload({
      type: 'PATIENT_ACCESS',
      patientId: patient._id.toString(),
      medvaultId: patient.medvaultId,
      abhaId: patient.abhaId,
    }, 10 * 60)
    const uri = `medvault://patient-access?token=${encodeURIComponent(signedPayload)}`

    res.json({
      token: signedPayload,
      uri,
      qrDataUrl: await toQrDataUrl(uri, patient.medvaultId || 'MedVault Patient'),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      patient: {
        id: patient._id,
        medvaultId: patient.medvaultId,
        abhaId: patient.abhaId,
        fullName: patient.fullName,
      },
    })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to generate patient QR' })
  }
})

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

router.get('/:id/quick-view', requireRole('DOCTOR'), async (req, res) => {
  try {
    const patientId = req.params.id
    const doctorId = req.user?.doctorId
    if (!doctorId) throw new Error('Doctor profile is required')

    const [patient, visits, labReports, currentVisit, visitsWithMe] = await Promise.all([
      Patient.findById(patientId).lean(),
      Visit.find({ patientId, status: 'COMPLETED' })
        .sort({ startedAt: -1 })
        .limit(3)
        .populate('doctorId', 'fullName')
        .populate('prescriptionId', 'diagnosis medications')
        .lean(),
      LabReport.find({ patientId }).sort({ reportDate: -1 }).limit(50).lean(),
      Visit.findOne({ patientId, doctorId, status: { $in: ['CHECKED_IN', 'IN_CONSULTATION'] } })
        .sort({ startedAt: -1 })
        .lean(),
      Visit.countDocuments({ patientId, doctorId, status: 'COMPLETED' }),
    ])
    if (!patient) throw new Error('Patient not found')

    const latestLabs = labReports.flatMap((report: any) => (report.results || []).map((result: any) => ({
      reportId: report._id,
      reportDate: report.reportDate,
      loincCode: result.loincCode,
      testName: result.testName,
      value: result.value,
      unit: result.unit,
      flag: result.flag,
      referenceRange: result.referenceRange,
    })))

    res.json({
      patient: {
        _id: patient._id,
        medvaultId: patient.medvaultId,
        fullName: patient.fullName,
        age: computeAge(patient.dateOfBirth),
        sex: patient.sex,
        phone: patient.contact?.primaryPhone,
        city: patient.contact?.address?.city,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies || [],
        chronicConditions: patient.chronicConditions || [],
        activeMedications: patient.activeMedications || [],
      },
      stats: {
        totalVisits: patient.stats?.totalVisits || 0,
        visitsWithMe,
        lastVisitDate: patient.stats?.lastVisitAt || visits[0]?.startedAt,
      },
      lastThreeVisits: visits.map((visit) => {
        const doctor = visit.doctorId as any
        const prescription = visit.prescriptionId as any
        return {
          visitId: visit._id,
          date: visit.startedAt,
          doctorName: doctor?.fullName || 'Doctor',
          isMyVisit: doctor?._id?.toString() === doctorId,
          primaryDiagnosis: prescription?.diagnosis?.[0]?.displayName || visit.chiefComplaint,
          medicationsCount: prescription?.medications?.length || 0,
        }
      }),
      latestLabs,
      todaysPreVisit: currentVisit?.preVisitSymptoms ? {
        rawText: currentVisit.preVisitSymptoms.rawText,
        recordedAt: currentVisit.preVisitSymptoms.recordedAt,
        aiTop3Diagnoses: currentVisit.preVisitSymptoms.aiTop3Diagnoses || [],
        redFlags: currentVisit.preVisitSymptoms.redFlags || [],
      } : null,
      currentVisitId: currentVisit?._id,
    })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch patient quick view' })
  }
})

router.post('/me/pre-visit-symptoms', requireRole('PATIENT'), async (req, res) => {
  try {
    if (!req.user?.patientId) throw new Error('Patient profile is required')
    const visit = await recordPreVisitSymptoms(req.user.patientId, {
      text: req.body.text,
      audioBase64: req.body.audioBase64 || req.body.audioFile,
      audioUrl: req.body.audioUrl,
      language: req.body.language,
      intendedDoctorId: req.body.intendedDoctorId,
      expectedVisitDate: req.body.expectedVisitDate,
    })
    res.status(201).json(visit)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to record pre-visit symptoms' })
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

router.get('/me/lab-orders', async (req, res) => {
  try {
    const orders = await listPatientLabOrders(req.user?.patientId || '')
    res.json(orders)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch lab orders' })
  }
})

router.post('/lab-orders/:id/use-alternate-lab', async (req, res) => {
  try {
    const order = await markPatientUsingAlternateLab(
      req.params.id,
      req.user?.patientId || '',
      req.user?.userId || '',
      String(req.body.alternateLabName || 'Alternate lab')
    )
    res.json(order)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update lab order' })
  }
})

export default router
