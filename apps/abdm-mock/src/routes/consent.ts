import { Router } from 'express'

const router = Router()

interface MockConsent {
  id: string
  patientAbhaId: string
  purpose: string
  hipName: string
  hiTypes: string[]
  status: string
  fromDate: string
  toDate: string
}

const mockConsents: MockConsent[] = []

router.post('/request', (req, res) => {
  const consent: MockConsent = {
    id: `CONS-${Date.now()}`,
    patientAbhaId: req.body.abhaId || 'unknown',
    purpose: req.body.purpose || 'MEDICAL_TREATMENT',
    hipName: req.body.hipName || 'MedVault',
    hiTypes: req.body.hiTypes || ['Prescription', 'DiagnosticReport'],
    status: 'GRANTED',
    fromDate: new Date().toISOString(),
    toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
  mockConsents.push(consent)
  res.json(consent)
})

router.get('/:id', (req, res) => {
  const consent = mockConsents.find(c => c.id === req.params.id)
  if (!consent) {
    res.status(404).json({ error: 'Consent not found' })
    return
  }
  res.json(consent)
})

export default router
