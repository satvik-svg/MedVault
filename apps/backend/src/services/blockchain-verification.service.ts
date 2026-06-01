import { Prescription } from '../models/Prescription.ts'
import { LabReport } from '../models/LabReport.ts'
import { AccessLog } from '../models/AccessLog.ts'
import { config } from '../config/env.ts'
import { canonicalizeLabReportForHashing, canonicalizePrescriptionForHashing } from '../utils/canonicalize.ts'
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

export async function verifyLabReportAnchoring(labReportId: string, actorUserId?: string): Promise<Record<string, unknown>> {
  const labReport = await LabReport.findById(labReportId)
  if (!labReport) throw new Error('Lab report not found')

  const currentHash = sha256HexPrefixed(canonicalizeLabReportForHashing(labReport))
  const storedHash = labReport.blockchain?.contentHash
  const isAnchored = labReport.blockchain?.status === 'ANCHORED'
  const hashMatches = storedHash === currentHash
  const verified = isAnchored && hashMatches

  if (actorUserId) {
    await AccessLog.create({
      actorUserId,
      action: 'BLOCKCHAIN_VERIFY',
      targetType: 'LabReport',
      targetId: labReport._id,
      patientId: labReport.patientId,
      metadata: { verified, currentHash, storedHash },
    })
  }

  const txHash = labReport.blockchain?.txHash || labReport.blockchainTxHash
  return {
    verified,
    reason: isAnchored ? undefined : 'Not yet anchored',
    anchoredAt: labReport.blockchain?.anchoredAt,
    contentHash: currentHash,
    onChainHash: storedHash,
    txHash,
    blockNumber: labReport.blockchain?.blockNumber,
    explorerUrl: txHash ? `${config.blockchain.explorerBaseUrl}/tx/${txHash}` : undefined,
    tampered: isAnchored && !hashMatches,
    network: config.blockchain.auditNetwork,
  }
}
