import { Router, type Router as RouterType } from 'express'
import { Prescription } from '../models/Prescription.ts'
import { verifyPrescriptionAnchoring } from '../services/blockchain-verification.service.ts'
import { computeAge } from '../utils/time.ts'

const router: RouterType = Router()

router.get('/prescription/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('doctorId')
      .populate('patientId')
    if (!prescription) return res.status(404).json({ valid: false, reason: 'Not found' })

    const doctor = prescription.doctorId as any
    const patient = prescription.patientId as any
    const blockchain = await verifyPrescriptionAnchoring(req.params.id)

    res.json({
      valid: true,
      prescriptionNumber: prescription.prescriptionNumber,
      issuedAt: prescription.issuedAt || prescription.createdAt,
      doctor: {
        name: doctor?.fullName,
        nmcRegNumber: doctor?.nmcRegNumber,
        verified: !!doctor?.verification?.nmcVerified,
      },
      patientNameAndAge: patient ? `${patient.fullName}, ${computeAge(patient.dateOfBirth)}` : undefined,
      medications: (prescription.medications || []).map((medication) => ({
        drug: medication.brandName || medication.genericName,
        strength: medication.strength,
        dosage: medication.dosage?.customInstructions || medication.dosage?.frequency,
      })),
      blockchain: {
        anchored: blockchain.verified || !!blockchain.txHash,
        txHash: blockchain.txHash,
        explorerUrl: blockchain.explorerUrl,
        tampered: blockchain.tampered,
      },
    })
  } catch (error) {
    res.status(400).json({ valid: false, reason: error instanceof Error ? error.message : 'Verification failed' })
  }
})

export default router
