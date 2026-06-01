import { Router, type Router as RouterType } from 'express'
import { authenticate, requireRole } from '../middleware/index.ts'
import { dispensePrescription, scanPrescriptionQR } from '../services/pharmacy.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.post('/scan-prescription', requireRole('PHARMACY_OPERATOR', 'CLINIC_ADMIN'), async (req, res) => {
  try {
    const prescription = await scanPrescriptionQR(req.body.qrData)
    res.json(prescription)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Prescription scan failed' })
  }
})

router.post('/dispense/:prescriptionId', requireRole('PHARMACY_OPERATOR', 'CLINIC_ADMIN'), async (req, res) => {
  try {
    const result = await dispensePrescription({
      prescriptionId: req.params.prescriptionId,
      pharmacyClinicId: req.body.pharmacyClinicId || req.user?.clinicId,
      operatorUserId: req.user?.userId || '',
      partial: req.body.partial,
      notes: req.body.notes,
      substitutions: req.body.substitutions,
    })
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Dispense failed' })
  }
})

export default router
