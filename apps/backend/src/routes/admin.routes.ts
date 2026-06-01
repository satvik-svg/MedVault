import { Router, type Router as RouterType } from 'express'
import {
  approveClinic,
  approveDoctor,
  rejectDoctor,
  getVerificationQueue,
} from '../controllers/admin.controller.ts'
import { authenticate, requireRole } from '../middleware/index.ts'

const router: RouterType = Router()

router.use(authenticate)
router.use(requireRole('PLATFORM_ADMIN'))

router.post('/verification/clinic/:id/approve', approveClinic)
router.post('/verification/doctor/:id/approve', approveDoctor)
router.post('/verification/doctor/:id/reject', rejectDoctor)
router.get('/verification/queue', getVerificationQueue)

export default router
