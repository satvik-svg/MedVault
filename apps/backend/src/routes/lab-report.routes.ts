import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/index.ts'
import { verifyLabReportAnchoring } from '../services/blockchain-verification.service.ts'

const router: RouterType = Router()

router.use(authenticate)

router.get('/:id/verify', async (req, res) => {
  try {
    const result = await verifyLabReportAnchoring(req.params.id, req.user?.userId)
    res.json(result)
  } catch (error) {
    res.status(400).json({ verified: false, reason: error instanceof Error ? error.message : 'Verification failed' })
  }
})

export default router
