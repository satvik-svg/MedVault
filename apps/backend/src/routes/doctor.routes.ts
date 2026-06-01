import { Router, type Router as RouterType } from 'express'
import {
  registerDoctor,
  uploadNmcCertificate,
  affiliateWithClinic,
  getDoctorMe,
} from '../controllers/doctor.controller.ts'
import { authenticate, requireRole } from '../middleware/index.ts'
import { Appointment } from '../models/Appointment.ts'
import { Patient } from '../models/Patient.ts'
import { buildPatientSummary, buildPatientTimeline } from '../services/patient-summary.service.ts'
import { checkMedicationForPrescription, createPrescription, SafetyCheckError } from '../services/prescription.service.ts'
import { checkOrRequestConsent } from '../services/consent.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.post('/register', registerDoctor)
router.post('/upload-nmc-certificate', requireRole('DOCTOR'), uploadNmcCertificate)
router.post('/affiliate/:clinicId', requireRole('DOCTOR'), affiliateWithClinic)
router.get('/me', getDoctorMe)

router.get('/today-queue', requireRole('DOCTOR'), async (req, res) => {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const appointments = await Appointment.find({
      doctorId: req.user?.doctorId,
      slotStart: { $gte: start, $lte: end },
      status: { $nin: ['CANCELLED', 'NO_SHOW'] },
    }).populate('patientId', 'fullName medvaultId sex bloodGroup')
    res.json(appointments)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch queue' })
  }
})

router.get('/patients', requireRole('DOCTOR'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.user?.doctorId })
      .distinct('patientId')
    const patients = await Patient.find({ _id: { $in: appointments } })
      .select('fullName medvaultId sex bloodGroup activeMedications allergies chronicConditions')
      .lean()
    res.json(patients)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch patients' })
  }
})

router.get('/patient/:patientId/record', requireRole('DOCTOR'), async (req, res) => {
  try {
    const [summary, timeline] = await Promise.all([
      buildPatientSummary(req.params.patientId, req.user?.doctorId),
      buildPatientTimeline(req.params.patientId),
    ])
    res.json({ summary, timeline })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch patient record' })
  }
})

router.post('/scan-qr', requireRole('DOCTOR'), async (req, res) => {
  try {
    const patient = await Patient.findOne({
      $or: [
        { medvaultId: req.body.medvaultId || req.body.token },
        { abhaId: req.body.abhaId || req.body.token },
      ],
    })
    if (!patient) throw new Error('Patient not found')
    const decision = await checkOrRequestConsent(patient._id.toString(), req.user?.userId || '', {
      scope: ['FULL', 'PRESCRIPTIONS', 'LAB_REPORTS'],
      purpose: 'CONSULTATION',
      granteeType: 'DOCTOR',
    })
    res.json({ patientId: patient._id, medvaultId: patient.medvaultId, ...decision })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'QR scan failed' })
  }
})

router.post('/interaction-check', requireRole('DOCTOR'), async (req, res) => {
  try {
    const result = await checkMedicationForPrescription(req.body.patientId, req.body.medication || req.body.new_drug)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Safety check failed' })
  }
})

router.post('/prescribe', requireRole('DOCTOR'), async (req, res) => {
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

export default router
