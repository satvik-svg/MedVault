import { config } from '../config.ts'
import { sha256HexPrefixed } from '../utils/hash.ts'

const abi = [
  'function anchorRecord(bytes32 recordId, bytes32 contentHash, uint8 recordType, bytes32 patientIdHash, bytes32 issuerIdHash) external',
]

export class ContractClient {
  async anchorRecord(
    recordId: string,
    contentHash: string,
    recordType: number,
    patientIdHash: string,
    issuerIdHash: string
  ): Promise<{ hash: string; blockNumber: number; wait: () => Promise<{ hash: string; blockNumber: number }> }> {
    if (!config.rpcUrl || !config.privateKey || !config.contractAddress) {
      const hash = sha256HexPrefixed(`${recordId}:${contentHash}:${recordType}:${Date.now()}`)
      return { hash, blockNumber: 0, wait: async () => ({ hash, blockNumber: 0 }) }
    }

    const { Contract, JsonRpcProvider, Wallet } = await import('ethers')
    const provider = new JsonRpcProvider(config.rpcUrl)
    const signer = new Wallet(config.privateKey, provider)
    const contract = new Contract(config.contractAddress, abi, signer)
    const tx = await contract.anchorRecord(recordId, contentHash, recordType, patientIdHash, issuerIdHash)
    return tx
  }
}
