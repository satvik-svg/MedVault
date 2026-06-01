import dotenv from 'dotenv'

dotenv.config()

export const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medvault',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  queueName: process.env.BLOCKCHAIN_QUEUE_NAME || 'blockchain-audit',
  rpcUrl: process.env.POLYGON_RPC_URL || process.env.SEPOLIA_RPC_URL || '',
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  contractAddress: process.env.PRESCRIPTION_AUDIT_CONTRACT_ADDRESS || '',
  hashSalt: process.env.BLOCKCHAIN_HASH_SALT || process.env.JWT_ACCESS_SECRET || 'change-me-32-bytes-min',
}
