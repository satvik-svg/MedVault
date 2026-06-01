import { Router, type Router as RouterType } from 'express'

const router: RouterType = Router()

router.all('*', (_req, res) => {
  res.status(410).json({ error: 'Emergency QR was removed in MedVault v2.' })
})

export default router
