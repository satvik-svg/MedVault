// BullMQ queue producers (Phase 4 will use these)
// For Phase 1, just placeholder exports

import { Queue } from 'bullmq'
import { config } from '../config/env.ts'

export const blockchainAuditQueue = new Queue(config.blockchain.queueName, {
  connection: { url: config.redis.url },
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: false,
  },
})

export const consentExpiryQueue = new Queue('consent-expiry', {
  connection: { url: config.redis.url },
})

export const accessLogProcessorQueue = new Queue('access-log-processor', {
  connection: { url: config.redis.url },
})

export async function enqueuePrescriptionAnchor(prescriptionId: string): Promise<void> {
  await blockchainAuditQueue.add(
    'anchor-prescription',
    { prescriptionId },
    { jobId: `rx-${prescriptionId}` }
  )
}

export async function enqueueLabReportAnchor(labReportId: string): Promise<void> {
  await blockchainAuditQueue.add(
    'anchor-lab-report',
    { labReportId },
    { jobId: `lab-${labReportId}` }
  )
}
