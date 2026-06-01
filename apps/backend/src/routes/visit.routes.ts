import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import { createVisit, listDoctorVisits, listPatientVisits, updateVisit } from '../services/visit.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.post('/', requireRole('DOCTOR'), async (req, res) => {
  try {
    if (!req.user) throw new Error('Unauthenticated')
    const result = await createVisit(req.body, req.user)
    res.status(result.visit ? 201 : 202).json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Visit creation failed' })
  }
})

router.get('/doctor/me', requireRole('DOCTOR'), async (req, res) => {
  try {
    const visits = await listDoctorVisits(req.user?.doctorId || '', req.query.status ? String(req.query.status) : undefined)
    res.json(visits)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list visits' })
  }
})

router.get('/patient/me', requireRole('PATIENT'), async (req, res) => {
  try {
    const visits = await listPatientVisits(req.user?.patientId || '')
    res.json(visits)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list visits' })
  }
})

router.patch('/:id', requireRole('DOCTOR'), async (req, res) => {
  try {
    if (!req.user) throw new Error('Unauthenticated')
    const visit = await updateVisit(req.params.id, req.body, req.user)
    res.json(visit)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Visit update failed' })
  }
})

export default router
