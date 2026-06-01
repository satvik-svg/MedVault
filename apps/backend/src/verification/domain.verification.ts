import dns from 'dns/promises'
import crypto from 'crypto'

function hashToken(clinicId: string, secret: string): string {
  return crypto.createHash('sha256').update(`${clinicId}${secret}`).digest('hex')
}

export async function verifyDomainViaDns(domain: string, clinicId: string): Promise<boolean> {
  const secret = process.env.DOMAIN_VERIFY_SECRET || 'domain-verify-secret'
  const expectedToken = `medvault-verify=${hashToken(clinicId, secret)}`

  try {
    const records = await dns.resolveTxt(`_medvault.${domain}`)
    return records.some(record => record.join('').includes(expectedToken))
  } catch {
    return false
  }
}

export function generateDomainVerificationToken(clinicId: string): string {
  const secret = process.env.DOMAIN_VERIFY_SECRET || 'domain-verify-secret'
  return hashToken(clinicId, secret)
}

export function generateDomainVerificationRecord(clinicId: string, domain: string): string {
  const token = generateDomainVerificationToken(clinicId)
  return `_medvault.${domain}  IN  TXT  "medvault-verify=${token}"`
}
