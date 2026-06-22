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
      allergies: [
        { allergen: 'Penicillin', severity: 'SEVERE', notes: 'Causes hives and dyspnea' }
      ],
      chronicConditions: [
        { displayName: 'Type 2 Diabetes Mellitus', diagnosedAt: new Date('2022-06-01') }
      ],
      activeMedications: [
        {
          displayName: 'Metformin 500mg',
          genericName: 'Metformin',
          strength: '500 mg',
          startedAt: new Date('2022-06-01'),
        }
      ],
    },
    create: {
      userId: patientUser.id,
      medvaultId: 'MV-DEMO-PATIENT',
      fullName: 'Demo Patient',
      dateOfBirth: new Date('1995-01-01'),
      sex: 'O',
      contact: { primaryPhone: '+919900000001', email: 'patient@medvault.dev' },
      allergies: [
        { allergen: 'Penicillin', severity: 'SEVERE', notes: 'Causes hives and dyspnea' }
      ],
      chronicConditions: [
        { displayName: 'Type 2 Diabetes Mellitus', diagnosedAt: new Date('2022-06-01') }
      ],
      activeMedications: [
        {
          displayName: 'Metformin 500mg',
          genericName: 'Metformin',
          strength: '500 mg',
          startedAt: new Date('2022-06-01'),
        }
      ],
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

  // Clean old visits, prescriptions, and labs to avoid key collisions on seed rerun
  await prisma.labReport.deleteMany({ where: { patientId: patient.id } })
  await prisma.labOrder.deleteMany({ where: { patientId: patient.id } })
  await prisma.prescription.deleteMany({ where: { patientId: patient.id } })
  await prisma.visit.deleteMany({ where: { patientId: patient.id } })

  // Seed sample visit history
  const visit = await prisma.visit.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      status: 'COMPLETED',
      type: 'WALK_IN',
      chiefComplaint: 'Severe cough and mild fever for 3 days',
      doctorNotes: 'Lungs clear, throat congested. Advised rest and hydration.',
      consultationFee: 500,
      paymentStatus: 'PAID',
      paymentMethod: 'UPI'
    }
  })

  const prescription = await prisma.prescription.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      visitId: visit.id,
      prescriptionNumber: 'MV-RX-DEMO-001',
      status: 'ISSUED',
      diagnosis: [
        { code: 'J06.9', displayName: 'Acute upper respiratory infection, unspecified' }
      ],
      medications: [
        {
          brandName: 'Augmentin 625 Duo',
          genericName: 'Amoxicillin + Clavulanic Acid',
          strength: '625 mg',
          dosage: '1 tab Morning, 1 tab Night (after food)',
          duration: '5 days',
          safetyChecks: { allergyConflict: false, ddiConflict: false }
        },
        {
          brandName: 'Paracetamol 650',
          genericName: 'Paracetamol',
          strength: '650 mg',
          dosage: '1 tab thrice daily (SOS for fever)',
          duration: '3 days',
          safetyChecks: { allergyConflict: false, ddiConflict: false }
        }
      ],
      notes: 'Take medicines post meals. Return if fever persists beyond 3 days.',
      blockchain: { status: 'ANCHORED', contentHash: '0x7f3a8b10d4c2b9a76e5d3c1a2f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e' },
      blockchainTxHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  })

  await prisma.visit.update({
    where: { id: visit.id },
    data: { prescriptionId: prescription.id }
  })

  const labOrder = await prisma.labOrder.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      visitId: visit.id,
      prescriptionId: prescription.id,
      labId: lab.id,
      orderNumber: 'MV-LO-DEMO-001',
      tests: [
        { loincCode: '4548-4', displayName: 'HbA1c', sampleType: 'Blood', price: 300 }
      ],
      totalEstimatedPrice: 300,
      status: 'DELIVERED_TO_DOCTOR',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  })

  const labReport = await prisma.labReport.create({
    data: {
      patientId: patient.id,
      labId: lab.id,
      labOrderId: labOrder.id,
      orderedByDoctorId: doctor.id,
      prescriptionId: prescription.id,
      reportNumber: 'MV-LR-DEMO-001',
      source: 'MEDVAULT_NATIVE_LAB_PARTNER',
      results: [
        {
          testName: 'HbA1c',
          loincCode: '4548-4',
          value: 6.8,
          unit: '%',
          referenceRange: { low: 4.0, high: 5.7 },
          flag: 'HIGH'
        }
      ],
      hasAbnormalValues: true,
      isVerified: true,
      blockchain: { status: 'ANCHORED', contentHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b' },
      blockchainTxHash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
      reportDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  })

  await prisma.labOrder.update({
    where: { id: labOrder.id },
    data: { labReportId: labReport.id }
  })

  await prisma.visit.update({
    where: { id: visit.id },
    data: { labOrderIds: [labOrder.id] }
  })

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
