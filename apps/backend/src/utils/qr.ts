import crypto from 'crypto'
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

export function toQrDataUrl(uri: string, label = 'MedVault QR'): string {
  const escapedUri = uri.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const escapedLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
    '<rect width="512" height="512" fill="#ffffff"/>',
    '<rect x="36" y="36" width="132" height="132" fill="#138984"/>',
    '<rect x="344" y="36" width="132" height="132" fill="#138984"/>',
    '<rect x="36" y="344" width="132" height="132" fill="#138984"/>',
    '<rect x="74" y="74" width="56" height="56" fill="#ffffff"/>',
    '<rect x="382" y="74" width="56" height="56" fill="#ffffff"/>',
    '<rect x="74" y="382" width="56" height="56" fill="#ffffff"/>',
    '<path d="M216 216h44v44h-44zM284 216h28v28h-28zM344 216h44v44h-44zM216 292h28v52h-28zM260 292h52v28h-52zM336 292h28v72h-28zM388 292h52v28h-52zM216 384h44v44h-44zM284 368h28v72h-28zM344 400h96v40h-96z" fill="#138984"/>',
    `<text x="256" y="490" font-family="Inter,Arial,sans-serif" font-size="15" text-anchor="middle" fill="#0f172a">${escapedLabel}</text>`,
    `<metadata>${escapedUri}</metadata>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
