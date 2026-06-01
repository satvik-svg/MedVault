import { config } from './env.ts'
import { connectPrisma, disconnectPrisma } from '../db/prisma.ts'

export async function connectDatabase(): Promise<void> {
  if (!config.database.url) {
    console.error('[DB] DATABASE_URL or POSTGRES_URL is required for Neon Postgres')
    process.exit(1)
  }

  try {
    await connectPrisma()
  } catch (error) {
    console.error('[DB] Neon Postgres connection error:', error)
    process.exit(1)
  }
}

export async function disconnectDatabase(): Promise<void> {
  await disconnectPrisma()
}
