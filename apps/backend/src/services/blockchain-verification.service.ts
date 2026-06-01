import { Prescription } from '../models/Prescription.ts'
import { AccessLog } from '../models/AccessLog.ts'
import { config } from '../config/env.ts'
import { canonicalizePrescriptionForHashing } from '../utils/canonicalize.ts'
import { sha256HexPrefixed } from '../utils/hash.ts'

export async function verifyPrescriptionAnchoring(prescriptionId: string, actorUserId?: string): Promise<Record<string, unknown>> {
  const prescription = await Prescription.findById(prescriptionId)
  if (!prescription) throw new Error('Prescription not found')

  const currentHash = sha256HexPrefixed(canonicalizePrescriptionForHashing(prescription))
  const storedHash = prescription.blockchain?.contentHash
  const isAnchored = prescription.blockchain?.status === 'ANCHORED'
  const hashMatches = storedHash === currentHash
  const verified = isAnchored && hashMatches

  if (actorUserId) {
    await AccessLog.create({
      actorUserId,
      action: 'BLOCKCHAIN_VERIFY',
      targetType: 'Prescription',
      targetId: prescription._id,
      patientId: prescription.patientId,
      metadata: { verified, currentHash, storedHash },
    })
  }

  const txHash = prescription.blockchain?.txHash || prescription.blockchainTxHash
  return {
    verified,
    reason: isAnchored ? undefined : 'Not yet anchored',
    anchoredAt: prescription.blockchain?.anchoredAt,
    contentHash: currentHash,
    onChainHash: storedHash,
    txHash,
    blockNumber: prescription.blockchain?.blockNumber,
    explorerUrl: txHash ? `${config.blockchain.explorerBaseUrl}/tx/${txHash}` : undefined,
    tampered: isAnchored && !hashMatches,
    network: config.blockchain.auditNetwork,
  }
}
