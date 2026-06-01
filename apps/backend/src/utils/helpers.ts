import { v4 as uuidv4 } from 'uuid'

export function generateMedvaultId(): string {
  const year = new Date().getFullYear()
  const random = uuidv4().slice(0, 5).toUpperCase()
  return `MV-${year}-${random}`
}

export function generateTokenId(): string {
  return uuidv4()
}

export function generateNonce(): string {
  return uuidv4()
}
