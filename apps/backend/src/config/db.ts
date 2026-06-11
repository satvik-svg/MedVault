import { config } from './env.ts'
import { connectPrisma, disconnectPrisma } from '../db/prisma.ts'

export async function connectDatabase(): Promise<void> {
  if (!config.database.url) {
    throw new Error('DATABASE_URL or POSTGRES_URL is required for Neon Postgres')
  }

  try {
    await connectPrisma()
  } catch (error) {
    console.error('[DB] Neon Postgres connection error:', error)
    throw error
  }
}

export async function disconnectDatabase(): Promise<void> {
  await disconnectPrisma()
}
