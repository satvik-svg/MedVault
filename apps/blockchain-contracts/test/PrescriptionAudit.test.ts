import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('PrescriptionAudit', () => {
  it('anchors and verifies a record', async () => {
    const Contract = await ethers.getContractFactory('PrescriptionAudit')
    const contract = await Contract.deploy()

    const recordId = ethers.keccak256(ethers.toUtf8Bytes('rx-001'))
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes('prescription content'))
    const patientHash = ethers.keccak256(ethers.toUtf8Bytes('patient-001'))
    const issuerHash = ethers.keccak256(ethers.toUtf8Bytes('doctor-001'))

    await contract.anchorRecord(recordId, contentHash, 0, patientHash, issuerHash)
    const [valid] = await contract.verifyRecord(recordId, contentHash)
    expect(valid).to.equal(true)

    const [invalid] = await contract.verifyRecord(recordId, ethers.keccak256(ethers.toUtf8Bytes('tampered')))
    expect(invalid).to.equal(false)
  })

  it('rejects duplicate anchoring', async () => {
    const Contract = await ethers.getContractFactory('PrescriptionAudit')
    const contract = await Contract.deploy()
    const recordId = ethers.keccak256(ethers.toUtf8Bytes('rx-duplicate'))
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes('content'))
    const patientHash = ethers.keccak256(ethers.toUtf8Bytes('patient'))
    const issuerHash = ethers.keccak256(ethers.toUtf8Bytes('issuer'))

    await contract.anchorRecord(recordId, contentHash, 0, patientHash, issuerHash)
    await expect(contract.anchorRecord(recordId, contentHash, 0, patientHash, issuerHash)).to.be.revertedWith('Already anchored')
  })
})
