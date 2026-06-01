export interface GstVerificationResult {
  verified: boolean
  reason?: string
  tradeName?: string
  legalName?: string
  status?: string
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][Z][0-9A-Z]$/

export async function verifyGstin(gstin: string): Promise<GstVerificationResult> {
  if (!GSTIN_REGEX.test(gstin)) {
    return { verified: false, reason: 'Invalid GSTIN format' }
  }

  // Mock implementation for development
  // Real implementation would call GST verification API
  return mockGstVerification(gstin)
}

function mockGstVerification(gstin: string): GstVerificationResult {
  const validPrefixes = ['24', '27', '29', '33', '36']
  const statePrefix = gstin.substring(0, 2)

  if (!validPrefixes.includes(statePrefix)) {
    return { verified: false, reason: 'GSTIN not found in registry' }
  }

  const checksum = gstin.charAt(gstin.length - 1)
  if (checksum === '0') {
    return { verified: false, reason: 'Invalid GSTIN checksum' }
  }

  return {
    verified: true,
    tradeName: gstin.substring(2, 7),
    legalName: 'Verified Taxpayer',
    status: 'ACTIVE',
  }
}
