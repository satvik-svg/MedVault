export const STATE_MEDICAL_COUNCILS = [
  'DMC',    // Delhi
  'MMC',    // Maharashtra
  'KMC',    // Karnataka
  'TNMC',   // Tamil Nadu
  'WBMC',   // West Bengal
  'GMC',    // Gujarat
  'RMC',    // Rajasthan
  'UPMC',   // Uttar Pradesh
  'MPMC',   // Madhya Pradesh
  'PMC',    // Punjab
  'HMC',    // Haryana
  'BMC',    // Bihar
  'AMC',    // Assam
  'KMC',    // Kerala
  'OMC',    // Odisha
  'CGMC',   // Chhattisgarh
  'JMC',    // Jharkhand
  'UKMC',   // Uttarakhand
  'HPMC',   // Himachal Pradesh
  'JKMCC',  // Jammu & Kashmir
] as const

export const COMMON_ICD10_CONDITIONS: Record<string, string> = {
  'E11.9': 'Type 2 diabetes mellitus without complications',
  'E11.65': 'Type 2 diabetes with hyperglycemia',
  'I10': 'Essential (primary) hypertension',
  'I11.9': 'Hypertensive heart disease without heart failure',
  'J45.909': 'Unspecified asthma, uncomplicated',
  'J44.9': 'Chronic obstructive pulmonary disease, unspecified',
  'E78.5': 'Hyperlipidemia, unspecified',
  'E66.9': 'Obesity, unspecified',
  'F41.9': 'Anxiety disorder, unspecified',
  'F32.9': 'Major depressive disorder, single episode, unspecified',
  'M54.5': 'Low back pain',
  'G43.909': 'Migraine, unspecified, not intractable',
  'K21.9': 'Gastro-esophageal reflux disease without esophagitis',
  'I25.10': 'Atherosclerotic heart disease of native coronary artery',
  'N18.9': 'Chronic kidney disease, unspecified',
}

export const MEDVAULT_ID_PREFIX = 'MV'

export const OTP_LENGTH = 6
export const OTP_TTL_SECONDS = 300
export const OTP_MAX_ATTEMPTS_PER_HOUR = 5
export const OTP_RATE_LIMIT_WINDOW_SECONDS = 3600

export const BCRYPT_ROUNDS = 12

export const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
export const ENCRYPTION_IV_LENGTH = 12
export const ENCRYPTION_KEY_LENGTH_HEX = 64
