import { Router } from 'express'

const router = Router()

const mockAbhaRecords: Record<string, {
  abhaId: string
  abhaAddress: string
  name: string
  yearOfBirth: number
  gender: string
  address: Record<string, string>
  status: string
}> = {
  '14-1234-5678-9012': {
    abhaId: '14-1234-5678-9012',
    abhaAddress: 'ravi.kumar@abdm',
    name: 'Ravi Kumar',
    yearOfBirth: 1990,
    gender: 'M',
    address: { state: 'Delhi', city: 'New Delhi', pincode: '110001' },
    status: 'ACTIVE',
  },
  '27-9876-5432-1098': {
    abhaId: '27-9876-5432-1098',
    abhaAddress: 'priya.sharma@abdm',
    name: 'Priya Sharma',
    yearOfBirth: 1985,
    gender: 'F',
    address: { state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
    status: 'ACTIVE',
  },
  '29-5555-6666-7777': {
    abhaId: '29-5555-6666-7777',
    abhaAddress: 'vikram.patel@abdm',
    name: 'Vikram Patel',
    yearOfBirth: 1978,
    gender: 'M',
    address: { state: 'Karnataka', city: 'Bangalore', pincode: '560001' },
    status: 'ACTIVE',
  },
}

router.get('/:abhaId', (req, res) => {
  const record = mockAbhaRecords[req.params.abhaId]
  if (!record) {
    res.status(404).json({ error: 'ABHA ID not found' })
    return
  }
  res.json(record)
})

export default router
