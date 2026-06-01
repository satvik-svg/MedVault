import type { Job } from 'bullmq'
import { prisma } from '../db.ts'
import { config } from '../config.ts'
import { ContractClient } from '../services/contract-client.ts'
import { canonicalizePrescription, sha256HexPrefixed } from '../utils/hash.ts'

const contract = new ContractClient()

export async function anchorPrescription(job: Job): Promise<Record<string, unknown>> {
  const prescriptionId = String(job.data.prescriptionId)
  const prescription = await prisma.prescription.findUnique({ where: { id: prescriptionId } })
  if (!prescription) throw new Error('Prescription not found')

  const contentHash = sha256HexPrefixed(canonicalizePrescription(prescription))
  const recordIdHash = sha256HexPrefixed(String(prescription.id))
  const patientIdHash = sha256HexPrefixed(`${String(prescription.patientId)}:${config.hashSalt}`)
  const issuerIdHash = sha256HexPrefixed(`${String(prescription.doctorId || 'external')}:${config.hashSalt}`)

  await prisma.prescription.update({
    where: { id: prescription.id },
    data: { blockchain: { ...(prescription.blockchain || {}), status: 'PENDING', contentHash } },
  })

  const tx = await contract.anchorRecord(recordIdHash, contentHash, 0, patientIdHash, issuerIdHash)
  const receipt = await tx.wait()

  await prisma.prescription.update({
    where: { id: prescription.id },
    data: {
      blockchain: {
        ...(prescription.blockchain || {}),
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
