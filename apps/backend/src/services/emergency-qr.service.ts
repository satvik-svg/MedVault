export class GeoAnomalyError extends Error {}

export async function generateEmergencyQR(): Promise<never> {
  throw new Error('Emergency QR was removed in MedVault v2.')
}

export async function revokeEmergencyQR(): Promise<never> {
  throw new Error('Emergency QR was removed in MedVault v2.')
}

export async function scanEmergencyQR(): Promise<never> {
  throw new Error('Emergency QR was removed in MedVault v2.')
}

export async function sweepExpiredEmergencyQRs(): Promise<number> {
  return 0
}
