import { Redis } from 'ioredis'
import { config } from './env.ts'

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('connect', () => {
  console.log('[Redis] Connected')
})

redis.on('error', (err: Error) => {
  console.error('[Redis] Error:', err)
})
