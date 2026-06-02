import crypto from 'crypto'
import QRCode from 'qrcode'
import { config } from '../config/env.ts'
import { hmacSha256Base64Url, timingSafeEqualText } from './hash.ts'

export type SignedPayload<T extends Record<string, unknown>> = T & {
  iat: number
  exp: number
  nonce: string
}

export function signPayload<T extends Record<string, unknown>>(
  payload: T,
  ttlSeconds: number,
  secret: string = config.qr.hmacSecret
): { signedPayload: string; payload: SignedPayload<T> } {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    nonce: crypto.randomBytes(16).toString('hex'),
  } as SignedPayload<T>
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const signature = hmacSha256Base64Url(secret, payloadB64)
  return { signedPayload: `${payloadB64}.${signature}`, payload: fullPayload }
}

export function verifySignedPayload<T extends Record<string, unknown>>(
  signedPayload: string,
  secret: string = config.qr.hmacSecret
): SignedPayload<T> {
  const [payloadB64, signature] = signedPayload.split('.')
  if (!payloadB64 || !signature) throw new Error('Malformed signed payload')

  const expectedSignature = hmacSha256Base64Url(secret, payloadB64)
  if (!timingSafeEqualText(signature, expectedSignature)) {
    throw new Error('Invalid signature')
  }

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as SignedPayload<T>
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Signed payload expired')
  }
  return payload
}

export async function toQrDataUrl(uri: string, _label = 'MedVault QR'): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#138984',
      light: '#ffffff',
    },
  })
}
