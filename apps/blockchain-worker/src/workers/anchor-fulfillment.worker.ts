import type { Job } from 'bullmq'
import { anchorPrescription } from './anchor-prescription.worker.ts'

export async function anchorFulfillment(job: Job): Promise<Record<string, unknown>> {
  return anchorPrescription(job)
}
