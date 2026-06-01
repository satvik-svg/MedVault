import type { Job } from 'bullmq'
import { mongoose } from '../db.ts'
import { config } from '../config.ts'
import { ContractClient } from '../services/contract-client.ts'
import { canonicalizePrescription, sha256HexPrefixed } from '../utils/hash.ts'

const contract = new ContractClient()

export async function anchorPrescription(job: Job): Promise<Record<string, unknown>> {
  const prescriptionId = String(job.data.prescriptionId)
  const db = mongoose.connection.db
  if (!db) throw new Error('MongoDB connection is not ready')
  const prescription = await db.collection('prescriptions').findOne({ _id: new mongoose.Types.ObjectId(prescriptionId) })
  if (!prescription) throw new Error('Prescription not found')

  const contentHash = sha256HexPrefixed(canonicalizePrescription(prescription))
  const recordIdHash = sha256HexPrefixed(String(prescription._id))
  const patientIdHash = sha256HexPrefixed(`${String(prescription.patientId)}:${config.hashSalt}`)
  const issuerIdHash = sha256HexPrefixed(`${String(prescription.doctorId || prescription.clinicId || 'external')}:${config.hashSalt}`)

  await db.collection('prescriptions').updateOne(
    { _id: prescription._id },
    { $set: { 'blockchain.status': 'PENDING', 'blockchain.contentHash': contentHash } }
  )

  const tx = await contract.anchorRecord(recordIdHash, contentHash, 0, patientIdHash, issuerIdHash)
  const receipt = await tx.wait()

  await db.collection('prescriptions').updateOne(
    { _id: prescription._id },
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
