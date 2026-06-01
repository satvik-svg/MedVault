import dotenv from 'dotenv'
dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medvault',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-32-bytes-min',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-32-bytes-min-different',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },

  qr: {
    hmacSecret: process.env.QR_HMAC_SECRET || 'change-me-32-bytes-min',
    emergencyQrTtlDays: parseInt(process.env.EMERGENCY_QR_TTL_DAYS || '90', 10),
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
  },

  abdm: {
    baseUrl: process.env.ABDM_BASE_URL || 'https://sandbox.abdm.gov.in',
    clientId: process.env.ABDM_CLIENT_ID || '',
    clientSecret: process.env.ABDM_CLIENT_SECRET || '',
    useMock: process.env.USE_ABDM_MOCK === 'true',
    mockUrl: process.env.ABDM_MOCK_URL || 'http://localhost:5050',
  },

  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000/api/ai',
    requestTimeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '15000', 10),
    enableFallbacks: process.env.AI_ENABLE_LOCAL_FALLBACKS !== 'false',
  },

  storage: {
    mode: process.env.STORAGE_MODE || 'local',
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL || process.env.API_BASE_URL || 'http://localhost:4000',
    s3Bucket: process.env.S3_BUCKET || '',
    s3Region: process.env.S3_REGION || '',
    s3Endpoint: process.env.S3_ENDPOINT || '',
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },

  blockchain: {
    queueName: process.env.BLOCKCHAIN_QUEUE_NAME || 'blockchain-audit',
    auditNetwork: process.env.BLOCKCHAIN_NETWORK || 'sepolia',
    rpcUrl: process.env.POLYGON_RPC_URL || process.env.SEPOLIA_RPC_URL || '',
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
    contractAddress: process.env.PRESCRIPTION_AUDIT_CONTRACT_ADDRESS || '',
    hashSalt: process.env.BLOCKCHAIN_HASH_SALT || process.env.JWT_ACCESS_SECRET || 'change-me-32-bytes-min',
    explorerBaseUrl: process.env.BLOCKCHAIN_EXPLORER_BASE_URL || 'https://sepolia.etherscan.io',
  },

  encryption: {
    key: process.env.DATA_ENCRYPTION_KEY || '0'.repeat(64),
  },

  isDev: process.env.NODE_ENV !== 'production',
}
