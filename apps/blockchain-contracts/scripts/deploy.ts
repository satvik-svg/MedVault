import { ethers } from 'hardhat'

async function main() {
  const Contract = await ethers.getContractFactory('PrescriptionAudit')
  const contract = await Contract.deploy()
  await contract.waitForDeployment()
  const address = await contract.getAddress()
  console.log(`PrescriptionAudit deployed to: ${address}`)
  console.log(`Set PRESCRIPTION_AUDIT_CONTRACT_ADDRESS=${address}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
