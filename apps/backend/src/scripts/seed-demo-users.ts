import bcrypt from 'bcrypt'
import { connectDatabase, disconnectDatabase } from '../config/db.ts'
import { prisma } from '../db/prisma.ts'

const password = 'MedVault@123'

async function upsertUser(email: string, phoneNumber: string, role: string, extra: Record<string, unknown> = {}) {
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.upsert({
    where: { email },
    update: {
      phoneNumber,
      passwordHash,
      role,
      isActive: true,
      isLocked: false,
      mustChangePassword: false,
      ...extra,
    },
    create: {
      email,
      phoneNumber,
      passwordHash,
      role,
      isPhoneVerified: true,
      isEmailVerified: true,
      isActive: true,
      isLocked: false,
      mustChangePassword: false,
      ...extra,
    },
  })
}

async function seedDemoUsers(): Promise<void> {
  await connectDatabase()

  const patientUser = await upsertUser('patient@medvault.dev', '+919900000001', 'PATIENT')
  const patient = await prisma.patient.upsert({
    where: { medvaultId: 'MV-DEMO-PATIENT' },
    update: {
      userId: patientUser.id,
      fullName: 'Demo Patient',
      contact: { primaryPhone: '+919900000001', email: 'patient@medvault.dev' },
    },
    create: {
      userId: patientUser.id,
      medvaultId: 'MV-DEMO-PATIENT',
      fullName: 'Demo Patient',
      dateOfBirth: new Date('1995-01-01'),
      sex: 'O',
      contact: { primaryPhone: '+919900000001', email: 'patient@medvault.dev' },
      onboarding: { method: 'DEMO_SEED', initialLoginCompleted: true },
    },
  })
  await prisma.user.update({ where: { id: patientUser.id }, data: { patientId: patient.id } })

  const doctorUser = await upsertUser('doctor@medvault.dev', '+919900000002', 'DOCTOR')
  const doctor = await prisma.doctor.upsert({
    where: { nmcRegNumber: 'DEMO-NMC-001' },
    update: {
      userId: doctorUser.id,
      fullName: 'Dr Demo Sharma',
      trustLevel: 'VERIFIED',
      verification: { manualReviewStatus: 'APPROVED' },
    },
    create: {
      userId: doctorUser.id,
      fullName: 'Dr Demo Sharma',
      nmcRegNumber: 'DEMO-NMC-001',
      stateMedicalCouncil: 'Demo Council',
      specializations: [{ code: 'general-medicine', displayName: 'General Medicine', isPrimary: true }],
      practice: {
        displayName: 'MedVault Demo Clinic',
        address: { line1: 'Demo Street', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        phone: '+919900000002',
      },
      trustLevel: 'VERIFIED',
      verification: { manualReviewStatus: 'APPROVED' },
      onboarding: { method: 'DEMO_SEED', initialLoginCompleted: true },
    },
  })
  await prisma.user.update({ where: { id: doctorUser.id }, data: { doctorId: doctor.id } })

  let lab = await prisma.lab.findFirst({ where: { email: 'lab@medvault.dev' } })
  if (lab) {
    lab = await prisma.lab.update({
      where: { id: lab.id },
      data: {
        displayName: 'MedVault Demo Lab',
        phone: '+919900000003',
        trustLevel: 'VERIFIED',
        verification: { manualReviewStatus: 'APPROVED' },
      },
    })
  } else {
    lab = await prisma.lab.create({
      data: {
        displayName: 'MedVault Demo Lab',
        phone: '+919900000003',
        email: 'lab@medvault.dev',
        address: { line1: 'Demo Lab Street', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        trustLevel: 'VERIFIED',
        verification: { manualReviewStatus: 'APPROVED' },
        onboarding: { method: 'DEMO_SEED', initialLoginCompleted: true },
        isActive: true,
      },
    })
  }
  const labUser = await upsertUser('lab@medvault.dev', '+919900000003', 'LAB_OPERATOR', { labId: lab.id })
  await prisma.lab.update({ where: { id: lab.id }, data: { operatorUserIds: [labUser.id] } })

  await upsertUser('admin@medvault.dev', '+919900000004', 'PLATFORM_ADMIN')

  console.log('Demo users ready:')
  console.log(`  patient@medvault.dev / ${password}`)
  console.log(`  doctor@medvault.dev / ${password}`)
  console.log(`  lab@medvault.dev / ${password}`)
  console.log(`  admin@medvault.dev / ${password}`)
}

seedDemoUsers()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectDatabase()
  })
