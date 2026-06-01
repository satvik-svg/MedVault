import { Router } from 'express'

const router = Router()

const mockFacilities: Record<string, {
  facilityId: string
  facilityName: string
  facilityType: string
  ownership: string
  address: { state: string; city: string; pincode: string }
  status: string
}> = {
  'IN0010000001': {
    facilityId: 'IN0010000001',
    facilityName: 'Apollo Hospital Indraprastha',
    facilityType: 'HOSPITAL',
    ownership: 'PRIVATE',
    address: { state: 'Delhi', city: 'New Delhi', pincode: '110076' },
    status: 'ACTIVE',
  },
  'IN0020000002': {
    facilityId: 'IN0020000002',
    facilityName: 'AIIMS Delhi',
    facilityType: 'HOSPITAL',
    ownership: 'GOVERNMENT',
    address: { state: 'Delhi', city: 'New Delhi', pincode: '110029' },
    status: 'ACTIVE',
  },
  'IN0030000003': {
    facilityId: 'IN0030000003',
    facilityName: 'Fortis Hospital Bangalore',
    facilityType: 'HOSPITAL',
    ownership: 'PRIVATE',
    address: { state: 'Karnataka', city: 'Bangalore', pincode: '560076' },
    status: 'ACTIVE',
  },
  'IN0040000004': {
    facilityId: 'IN0040000004',
    facilityName: 'Lilavati Hospital Mumbai',
    facilityType: 'HOSPITAL',
    ownership: 'PRIVATE',
    address: { state: 'Maharashtra', city: 'Mumbai', pincode: '400050' },
    status: 'ACTIVE',
  },
  'IN0050000005': {
    facilityId: 'IN0050000005',
    facilityName: 'Closed Facility',
    facilityType: 'CLINIC',
    ownership: 'PRIVATE',
    address: { state: 'Delhi', city: 'New Delhi', pincode: '110001' },
    status: 'INACTIVE',
  },
  'IN0060000006': {
    facilityId: 'IN0060000006',
    facilityName: 'Medanta The Medicity',
    facilityType: 'HOSPITAL',
    ownership: 'PRIVATE',
    address: { state: 'Haryana', city: 'Gurugram', pincode: '122001' },
    status: 'ACTIVE',
  },
  'IN0070000007': {
    facilityId: 'IN0070000007',
    facilityName: 'CMC Vellore',
    facilityType: 'HOSPITAL',
    ownership: 'PRIVATE',
    address: { state: 'Tamil Nadu', city: 'Vellore', pincode: '632004' },
    status: 'ACTIVE',
  },
  'IN0080000008': {
    facilityId: 'IN0080000008',
    facilityName: 'KEM Hospital Mumbai',
    facilityType: 'HOSPITAL',
    ownership: 'GOVERNMENT',
    address: { state: 'Maharashtra', city: 'Mumbai', pincode: '400012' },
    status: 'ACTIVE',
  },
  'IN0090000009': {
    facilityId: 'IN0090000009',
    facilityName: 'SGPGI Lucknow',
    facilityType: 'HOSPITAL',
    ownership: 'GOVERNMENT',
    address: { state: 'Uttar Pradesh', city: 'Lucknow', pincode: '226014' },
    status: 'ACTIVE',
  },
  'IN0100000010': {
    facilityId: 'IN0100000010',
    facilityName: 'Apollo Pharmacy Chennai',
    facilityType: 'PHARMACY',
    ownership: 'PRIVATE',
    address: { state: 'Tamil Nadu', city: 'Chennai', pincode: '600001' },
    status: 'ACTIVE',
  },
}

router.get('/:hfrId', (req, res) => {
  const facility = mockFacilities[req.params.hfrId]
  if (!facility) {
    res.status(404).json({ error: 'Facility not found in HFR registry' })
    return
  }
  res.json(facility)
})

export default router
