import type { Job } from 'bullmq'
import { mongoose } from '../db.ts'
import { config } from '../config.ts'
import { ContractClient } from '../services/contract-client.ts'
import { canonicalizeLabReport, sha256HexPrefixed } from '../utils/hash.ts'

const contract = new ContractClient()

export async function anchorLabReport(job: Job): Promise<Record<string, unknown>> {
  const labReportId = String(job.data.labReportId)
  const db = mongoose.connection.db
  if (!db) throw new Error('MongoDB connection is not ready')

  const labReport = await db.collection('labreports').findOne({ _id: new mongoose.Types.ObjectId(labReportId) })
  if (!labReport) throw new Error('Lab report not found')

  if (labReport.source !== 'MEDVAULT_NATIVE_LAB_PARTNER') {
    await db.collection('labreports').updateOne(
      { _id: labReport._id },
      { $set: { 'blockchain.status': 'NOT_QUEUED' } }
    )
    return { skipped: true, reason: 'Lab report is not lab partner issued' }
  }

  const contentHash = sha256HexPrefixed(canonicalizeLabReport(labReport))
  const recordIdHash = sha256HexPrefixed(String(labReport._id))
  const patientIdHash = sha256HexPrefixed(`${String(labReport.patientId)}:${config.hashSalt}`)
  const issuerIdHash = sha256HexPrefixed(`${String(labReport.labId || 'external')}:${config.hashSalt}`)

  await db.collection('labreports').updateOne(
    { _id: labReport._id },
    { $set: { 'blockchain.status': 'PENDING', 'blockchain.contentHash': contentHash } }
  )

  const tx = await contract.anchorRecord(recordIdHash, contentHash, 1, patientIdHash, issuerIdHash)
  const receipt = await tx.wait()

  await db.collection('labreports').updateOne(
    { _id: labReport._id },
    {
      $set: {
        'blockchain.status': 'ANCHORED',
        'blockchain.txHash': receipt.hash,
        'blockchain.blockNumber': receipt.blockNumber,
        'blockchain.anchoredAt': new Date(),
        blockchainTxHash: receipt.hash,
      },
    }
  )

  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, contentHash }
}
