import mongoose from 'mongoose'
import { config } from './env.ts'

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri)
    console.log('[DB] Connected to MongoDB')
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error)
    process.exit(1)
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected')
  })

  mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB error:', err)
  })
}
