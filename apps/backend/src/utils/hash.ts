import crypto from 'crypto'

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function sha256HexPrefixed(input: string): string {
  return `0x${sha256Hex(input)}`
}

export function hmacSha256Base64Url(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

export function timingSafeEqualText(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer)
}
