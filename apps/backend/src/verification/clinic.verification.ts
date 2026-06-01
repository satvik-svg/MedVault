import { Clinic } from '../models/Clinic.ts'
import { verifyClinicHfr } from './abdm.client.ts'
import type { HfrVerificationResult } from './abdm.client.ts'

export async function processHfrVerification(clinicId: string): Promise<HfrVerificationResult> {
  const clinic = await Clinic.findById(clinicId)
  if (!clinic) throw new Error('Clinic not found')
  if (!clinic.hfrId) throw new Error('Clinic has no HFR ID')

  const result = await verifyClinicHfr(clinic.hfrId)

  if (result.verified) {
    clinic.verification.hfrVerified = true
    clinic.verification.hfrVerifiedAt = new Date()
    clinic.verification.hfrRawResponse = result.rawResponse as Record<string, unknown>

    // Upgrade trust level
    if (clinic.verification.gstVerified && clinic.verification.domainVerified) {
      clinic.trustLevel = 'TIER_1_FULL'
    } else if (clinic.verification.hfrVerified) {
      clinic.trustLevel = 'TIER_2_PARTIAL'
    }

    await clinic.save()
  }

  return result
}
