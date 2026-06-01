import jwt from 'jsonwebtoken'
import type { StringValue } from 'ms'
import { config } from '../config/env.ts'

export interface AccessTokenPayload {
  userId: string
  role: string
  patientId?: string
  doctorId?: string
  clinicId?: string
  trustLevel?: string
}

export function issueAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl as StringValue,
    issuer: 'medvault',
    audience: 'medvault-api',
  } as jwt.SignOptions)
}

export function issueRefreshToken(userId: string, tokenId: string): string {
  return jwt.sign({ userId, tokenId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTtl as StringValue,
    issuer: 'medvault',
  } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret, {
    audience: 'medvault-api',
    issuer: 'medvault',
  }) as AccessTokenPayload
}

export function verifyRefreshToken(token: string): { userId: string; tokenId: string } {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: 'medvault',
  }) as { userId: string; tokenId: string }
}
