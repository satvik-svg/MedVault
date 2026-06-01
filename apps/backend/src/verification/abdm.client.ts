import axios from 'axios'
import { config } from '../config/env.ts'

const ABDM_BASE = config.abdm.useMock ? config.abdm.mockUrl : config.abdm.baseUrl

export interface HfrVerificationResult {
  verified: boolean
  reason?: string
  facilityName?: string
  type?: string
  address?: Record<string, string>
  rawResponse?: unknown
}

export async function verifyClinicHfr(hfrId: string): Promise<HfrVerificationResult> {
  try {
    const response = await axios.get(`${ABDM_BASE}/api/v1/facility/${hfrId}`)

    if (response.status !== 200) {
      return { verified: false, reason: 'Not found in HFR registry' }
    }

    const facility = response.data
    if (facility.status !== 'ACTIVE') {
      return { verified: false, reason: 'Facility not active in HFR' }
    }

    return {
      verified: true,
      facilityName: facility.facilityName,
      type: facility.facilityType,
      address: facility.address,
      rawResponse: facility,
    }
  } catch (error) {
    return { verified: false, reason: `HFR verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}
