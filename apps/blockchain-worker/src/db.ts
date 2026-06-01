import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => any }

export const prisma = new PrismaClient()

export async function connectDatabase(): Promise<void> {
  await prisma.$connect()
}
