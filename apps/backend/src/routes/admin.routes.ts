import { Router, type Router as RouterType } from 'express'
import {
  approveDoctor,
  approveLab,
  rejectDoctor,
  rejectLab,
  requestDoctorDocs,
  getVerificationQueue,
} from '../controllers/admin.controller.ts'
import { authenticate, requireRole } from '../middleware/index.ts'

const router: RouterType = Router()

router.use(authenticate)
router.use(requireRole('PLATFORM_ADMIN'))

router.post('/verification/doctor/:id/approve', approveDoctor)
router.post('/verification/doctor/:id/reject', rejectDoctor)
router.post('/verification/doctor/:id/request-docs', requestDoctorDocs)
router.post('/verification/lab/:id/approve', approveLab)
router.post('/verification/lab/:id/reject', rejectLab)
router.get('/verification/queue', getVerificationQueue)
router.get('/verification/doctors/queue', getVerificationQueue)
router.get('/verification/labs/queue', getVerificationQueue)

export default router
