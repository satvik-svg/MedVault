import type { Job } from 'bullmq'
import { prisma } from '../db.ts'
import { config } from '../config.ts'
import { ContractClient } from '../services/contract-client.ts'
import { canonicalizeLabReport, sha256HexPrefixed } from '../utils/hash.ts'

const contract = new ContractClient()

export async function anchorLabReport(job: Job): Promise<Record<string, unknown>> {
  const labReportId = String(job.data.labReportId)
  const labReport = await prisma.labReport.findUnique({ where: { id: labReportId } })
  if (!labReport) throw new Error('Lab report not found')

  if (labReport.source !== 'MEDVAULT_NATIVE_LAB_PARTNER') {
    await prisma.labReport.update({
      where: { id: labReport.id },
      data: { blockchain: { ...(labReport.blockchain || {}), status: 'NOT_QUEUED' } },
    })
    return { skipped: true, reason: 'Lab report is not lab partner issued' }
  }

  const contentHash = sha256HexPrefixed(canonicalizeLabReport(labReport))
  const recordIdHash = sha256HexPrefixed(String(labReport._id))
  const patientIdHash = sha256HexPrefixed(`${String(labReport.patientId)}:${config.hashSalt}`)
  const issuerIdHash = sha256HexPrefixed(`${String(labReport.labId || 'external')}:${config.hashSalt}`)

  await prisma.labReport.update({
    where: { id: labReport.id },
    data: { blockchain: { ...(labReport.blockchain || {}), status: 'PENDING', contentHash } },
  })

  const tx = await contract.anchorRecord(recordIdHash, contentHash, 1, patientIdHash, issuerIdHash)
  const receipt = await tx.wait()

  await prisma.labReport.update({
    where: { id: labReport.id },
    data: {
      blockchain: {
        ...(labReport.blockchain || {}),
        status: 'ANCHORED',
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        anchoredAt: new Date().toISOString(),
        contentHash,
      },
      blockchainTxHash: receipt.hash,
    },
  })

  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, contentHash }
}
