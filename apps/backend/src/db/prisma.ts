import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => any }

export const prisma = new PrismaClient()

export async function connectPrisma(): Promise<void> {
  await prisma.$connect()
  console.log('[DB] Connected to Neon Postgres via Prisma')
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}
