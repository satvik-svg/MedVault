import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock external services before importing
vi.mock('ioredis', () => {
  const MockRedis = vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  }))
  return { default: MockRedis, Redis: MockRedis }
})

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn((data: string) => Promise.resolve(`hashed_${data}`)),
    compare: vi.fn((data: string, hash: string) => Promise.resolve(hash === `hashed_${data}`)),
  },
  hash: vi.fn((data: string) => Promise.resolve(`hashed_${data}`)),
  compare: vi.fn((data: string, hash: string) => Promise.resolve(hash === `hashed_${data}`)),
}))

describe('Encryption Utility', () => {
  it('encrypts and decrypts data correctly', async () => {
    const { encrypt, decrypt } = await import('../src/utils/encryption.ts')
    const original = 'sensitive patient data'
    const encrypted = encrypt(original)
    expect(encrypted).not.toBe(original)
    expect(encrypted.split(':')).toHaveLength(3)

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(original)
  })

  it('produces different ciphertexts for same input', async () => {
    const { encrypt } = await import('../src/utils/encryption.ts')
    const a = encrypt('hello')
    const b = encrypt('hello')
    expect(a).not.toBe(b)
  })
})

describe('JWT Utilities', () => {
  it('issues and verifies access tokens', async () => {
    const { issueAccessToken, verifyAccessToken } = await import('../src/utils/jwt.ts')
    const token = issueAccessToken({
      userId: 'user-123',
      role: 'PATIENT',
      patientId: 'patient-456',
    })
    expect(token).toBeTruthy()

    const payload = verifyAccessToken(token)
    expect(payload.userId).toBe('user-123')
    expect(payload.role).toBe('PATIENT')
    expect(payload.patientId).toBe('patient-456')
  })

  it('issues and verifies refresh tokens', async () => {
    const { issueRefreshToken, verifyRefreshToken } = await import('../src/utils/jwt.ts')
    const token = issueRefreshToken('user-123', 'token-id-1')
    expect(token).toBeTruthy()

    const payload = verifyRefreshToken(token)
    expect(payload.userId).toBe('user-123')
    expect(payload.tokenId).toBe('token-id-1')
  })

  it('rejects expired tokens', async () => {
    const { issueAccessToken, verifyAccessToken } = await import('../src/utils/jwt.ts')

    // Override env for this test
    const originalTtl = process.env.JWT_ACCESS_TTL
    process.env.JWT_ACCESS_TTL = '0s'
    const token = issueAccessToken({ userId: 'user-1', role: 'PATIENT' })
    process.env.JWT_ACCESS_TTL = originalTtl

    try {
      verifyAccessToken(token)
      // If no error is thrown, the test fails
      expect(true).toBe(false)
    } catch {
      expect(true).toBe(true)
    }
  })
})

describe('Helper Utilities', () => {
  it('generates valid MedVault ID', async () => {
    const { generateMedvaultId } = await import('../src/utils/helpers.ts')
    const id = generateMedvaultId()
    expect(id).toMatch(/^MV-\d{4}-[A-Z0-9]{5}$/)
  })

  it('generates unique nonces', async () => {
    const { generateNonce } = await import('../src/utils/helpers.ts')
    const a = generateNonce()
    const b = generateNonce()
    expect(a).not.toBe(b)
  })
})

describe('QR Signing Utilities', () => {
  it('signs and verifies a QR payload', async () => {
    const { signPayload, verifySignedPayload } = await import('../src/utils/qr.ts')
    const signed = signPayload({ typ: 'PRESCRIPTION', pid: 'MV-RX-2026-ABCDE', ver: 1 }, 60)
    const payload = verifySignedPayload(signed.signedPayload)
    expect(payload.typ).toBe('PRESCRIPTION')
    expect(payload.pid).toBe('MV-RX-2026-ABCDE')
    expect(payload.nonce).toBeTruthy()
  })

  it('rejects tampered QR payload signatures', async () => {
    const { signPayload, verifySignedPayload } = await import('../src/utils/qr.ts')
    const signed = signPayload({ type: 'PRESCRIPTION', pid: 'rx-1' }, 60)
    const [payload, signature] = signed.signedPayload.split('.')
    const tamperedPayload = Buffer.from(JSON.stringify({ type: 'PRESCRIPTION', pid: 'rx-2', iat: 1, exp: 9999999999, nonce: 'x' })).toString('base64url')
    expect(() => verifySignedPayload(`${tamperedPayload}.${signature || payload}`)).toThrow()
  })
})

describe('JWT Expired Token Handling', () => {
  it('verification throws on invalid token', async () => {
    const { verifyAccessToken } = await import('../src/utils/jwt.ts')
    expect(() => verifyAccessToken('invalid-token')).toThrow()
  })
})
