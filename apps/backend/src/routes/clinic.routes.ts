import { Router, type Router as RouterType } from 'express'
import {
  registerClinic,
  verifyHfr,
  verifyDomain,
  uploadDocuments,
  getClinicMe,
} from '../controllers/clinic.controller.ts'
import { confirmDoctorAffiliation } from '../controllers/doctor.controller.ts'
import { authenticate, requireRole } from '../middleware/index.ts'

const router: RouterType = Router()

router.use(authenticate)

router.post('/register', registerClinic)
router.post('/verify-hfr', requireRole('CLINIC_ADMIN'), verifyHfr)
router.post('/verify-domain', requireRole('CLINIC_ADMIN'), verifyDomain)
router.post('/upload-documents', requireRole('CLINIC_ADMIN'), uploadDocuments)
router.post('/affiliate/:doctorId/confirm', requireRole('CLINIC_ADMIN'), confirmDoctorAffiliation)
router.get('/me', getClinicMe)

export default router
