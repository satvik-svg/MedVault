import { Worker } from 'bullmq'
import { connectDatabase } from './db.ts'
import { config } from './config.ts'
import { anchorFulfillment } from './workers/anchor-fulfillment.worker.ts'
import { anchorLabReport } from './workers/anchor-lab-report.worker.ts'
import { anchorPrescription } from './workers/anchor-prescription.worker.ts'

await connectDatabase()

const worker = new Worker(
  config.queueName,
  async (job) => {
    switch (job.name) {
      case 'anchor-prescription':
        return anchorPrescription(job)
      case 'anchor-lab-report':
        return anchorLabReport(job)
      case 'anchor-fulfillment':
        return anchorFulfillment(job)
      default:
        throw new Error(`Unknown blockchain job: ${job.name}`)
    }
  },
  {
    connection: { url: config.redisUrl },
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
  }
)

worker.on('completed', (job) => {
  console.log(`[BlockchainWorker] ${job.name}:${job.id} completed`)
})

worker.on('failed', async (job, error) => {
  console.error(`[BlockchainWorker] ${job?.name}:${job?.id} failed`, error)
})

console.log(`[BlockchainWorker] listening on ${config.queueName}`)
