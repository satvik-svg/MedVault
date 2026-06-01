import dotenv from 'dotenv'

dotenv.config()

export const config = {
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  queueName: process.env.BLOCKCHAIN_QUEUE_NAME || 'blockchain-audit',
  rpcUrl: process.env.POLYGON_RPC_URL || process.env.SEPOLIA_RPC_URL || '',
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  contractAddress: process.env.PRESCRIPTION_AUDIT_CONTRACT_ADDRESS || '0x532092fE865B3D96182083BeDE30E1a6C79BDcbB',
  hashSalt: process.env.BLOCKCHAIN_HASH_SALT || process.env.JWT_ACCESS_SECRET || 'change-me-32-bytes-min',
}
