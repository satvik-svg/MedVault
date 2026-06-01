import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

export async function connectPrisma(): Promise<void> {
  await prisma.$connect()
  console.log('[DB] Connected to Neon Postgres via Prisma')
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}
