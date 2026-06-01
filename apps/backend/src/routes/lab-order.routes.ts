import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import {
  createLabOrder,
  listPatientLabOrders,
  markPatientUsingAlternateLab,
} from '../services/lab-order.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.post('/', requireRole('DOCTOR'), async (req, res) => {
  try {
    if (!req.user) throw new Error('Unauthenticated')
    const order = await createLabOrder(req.body, req.user)
    res.status(201).json(order)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lab order creation failed' })
  }
})

router.get('/patient/me', requireRole('PATIENT'), async (req, res) => {
  try {
    const orders = await listPatientLabOrders(req.user?.patientId || '')
    res.json(orders)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list lab orders' })
  }
})

router.post('/:id/use-alternate-lab', requireRole('PATIENT'), async (req, res) => {
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
