import { Router, type Router as RouterType } from 'express'

const router: RouterType = Router()

router.all('*', (_req, res) => {
  res.status(410).json({
    error: 'Clinic-admin APIs were removed in MedVault v2. Use doctor practice fields and assisted onboarding instead.',
  })
})

export default router
