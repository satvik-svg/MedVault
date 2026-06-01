import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import {
  bookAppointment,
  findAvailableSlots,
  processPreVisitSymptoms,
  updateAppointmentStatus,
  upsertDoctorAvailability,
} from '../services/appointment.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.get('/slots', async (req, res) => {
  try {
    const { doctorId, clinicId, date } = req.query
    const slots = await findAvailableSlots(String(doctorId), String(clinicId), new Date(String(date)))
    res.json(slots)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch slots' })
  }
})

router.post('/availability', requireRole('DOCTOR'), async (req, res) => {
  try {
    const availability = await upsertDoctorAvailability({
      ...req.body,
      doctorId: req.user?.doctorId,
      clinicId: req.body.clinicId || req.user?.clinicId,
    })
    res.status(201).json(availability)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to save availability' })
  }
})

router.post('/book', requireRole('PATIENT', 'CLINIC_ADMIN'), async (req, res) => {
  try {
    const appointment = await bookAppointment({
      ...req.body,
      patientId: req.body.patientId || req.user?.patientId,
      slotStart: new Date(req.body.slotStart),
    })
    res.status(201).json(appointment)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to book appointment' })
  }
})

router.patch('/:id/status', async (req, res) => {
  try {
    const appointment = await updateAppointmentStatus(req.params.id, req.body.status, req.body)
    res.json(appointment)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update appointment' })
  }
})

router.post('/:id/pre-visit-symptoms', requireRole('PATIENT', 'CLINIC_ADMIN'), async (req, res) => {
  try {
    const result = await processPreVisitSymptoms({
      appointmentId: req.params.id,
      text: req.body.text,
      audioBase64: req.body.audioBase64,
      audioUrl: req.body.audioUrl,
    })
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to process symptoms' })
  }
})

export default router
