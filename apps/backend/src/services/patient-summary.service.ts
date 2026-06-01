import { Appointment } from '../models/Appointment.ts'
import { LabReport } from '../models/LabReport.ts'
import { Patient } from '../models/Patient.ts'
import { Prescription } from '../models/Prescription.ts'
import { redis } from '../config/redis.ts'
import { computeAge, durationToDays } from '../utils/time.ts'
import { aiClient } from './ai-client.service.ts'

function lastMonths(count: number): string[] {
  const labels: string[] = []
  const cursor = new Date()
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1)
    labels.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  return labels
}

function aggregateVisitsByMonth(appointments: Array<{ slotStart?: Date; scheduledAt?: Date }>, months = 12): Array<{ month: string; count: number }> {
  const buckets = new Map(lastMonths(months).map((month) => [month, 0]))
  for (const appointment of appointments) {
    const date = appointment.slotStart || appointment.scheduledAt
    if (!date) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1)
  }
  return [...buckets.entries()].map(([month, count]) => ({ month, count }))
}

function aggregateDiagnoses(prescriptions: Array<{ diagnosis?: Array<{ icd10Code: string; displayName?: string }> }>): Array<{ icd10Code: string; displayName?: string; count: number }> {
  const counts = new Map<string, { icd10Code: string; displayName?: string; count: number }>()
  for (const prescription of prescriptions) {
    for (const diagnosis of prescription.diagnosis || []) {
      const existing = counts.get(diagnosis.icd10Code) || { icd10Code: diagnosis.icd10Code, displayName: diagnosis.displayName, count: 0 }
      existing.count += 1
      counts.set(diagnosis.icd10Code, existing)
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8)
}

function buildMedicationTimeline(prescriptions: Array<{ createdAt?: Date; medications?: Array<{ rxnormCui: string; genericName: string; dosage?: { duration?: { value?: number; unit?: string } } }> }>): unknown[] {
  return prescriptions.flatMap((prescription) => (prescription.medications || []).map((medication) => ({
    rxnormCui: medication.rxnormCui,
    genericName: medication.genericName,
    startedAt: prescription.createdAt,
    expectedEndAt: prescription.createdAt ? new Date(prescription.createdAt.getTime() + durationToDays(medication.dosage?.duration) * 86_400_000) : undefined,
  })))
}

function computeAdherence(prescriptions: Array<{ createdAt?: Date; medications?: Array<{ rxnormCui: string; dosage?: { duration?: { value?: number; unit?: string } } }> }>): { score: 'INSUFFICIENT_DATA' | 'GOOD' | 'MODERATE' | 'POOR'; gaps: number } {
  const byDrug = new Map<string, Array<{ createdAt: Date; durationDays: number }>>()
  for (const prescription of prescriptions) {
    if (!prescription.createdAt) continue
    for (const medication of prescription.medications || []) {
      const durationDays = durationToDays(medication.dosage?.duration)
      if (durationDays < 28) continue
      const entries = byDrug.get(medication.rxnormCui) || []
      entries.push({ createdAt: prescription.createdAt, durationDays })
      byDrug.set(medication.rxnormCui, entries)
    }
  }

  let gaps = 0
  let refillSeries = 0
  for (const entries of byDrug.values()) {
    entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    if (entries.length < 2) continue
    refillSeries += 1
    for (let index = 1; index < entries.length; index += 1) {
      const expected = entries[index - 1].createdAt.getTime() + entries[index - 1].durationDays * 86_400_000
      const gapDays = Math.round((entries[index].createdAt.getTime() - expected) / 86_400_000)
      if (gapDays > 7) gaps += 1
    }
  }

  if (!refillSeries) return { score: 'INSUFFICIENT_DATA', gaps: 0 }
  if (gaps === 0) return { score: 'GOOD', gaps }
  if (gaps <= 2) return { score: 'MODERATE', gaps }
  return { score: 'POOR', gaps }
}

function extractLabTrends(labs: Array<{ reportDate?: Date; results?: Array<{ testName: string; value?: unknown; unit?: string; flag?: string }> }>): Record<string, unknown[]> {
  const trends: Record<string, unknown[]> = {}
  for (const lab of labs) {
    for (const result of lab.results || []) {
      if (typeof result.value !== 'number') continue
      trends[result.testName] = trends[result.testName] || []
      trends[result.testName].push({
        date: lab.reportDate,
        value: result.value,
        unit: result.unit,
        flag: result.flag,
      })
    }
  }
  return trends
}

export async function buildPatientTimeline(patientId: string, filters: { from?: Date; to?: Date; types?: string[] } = {}): Promise<unknown[]> {
  const from = filters.from || new Date(0)
  const to = filters.to || new Date()
  const [prescriptions, labs, appointments] = await Promise.all([
    Prescription.find({ patientId, createdAt: { $gte: from, $lte: to } }).lean(),
    LabReport.find({ patientId, reportDate: { $gte: from, $lte: to } }).lean(),
    Appointment.find({ patientId, slotStart: { $gte: from, $lte: to } }).lean(),
  ])

  return [
    ...prescriptions.map((prescription) => ({ type: 'PRESCRIPTION', date: prescription.createdAt, data: prescription })),
    ...labs.map((lab) => ({ type: 'LAB_REPORT', date: lab.reportDate, data: lab })),
    ...appointments.map((appointment) => ({ type: 'APPOINTMENT', date: appointment.slotStart, data: appointment })),
  ]
    .filter((event) => !filters.types?.length || filters.types.includes(event.type))
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
}

export async function buildPatientSummary(patientId: string, viewerDoctorId?: string): Promise<Record<string, unknown>> {
  const cacheKey = `summary:${patientId}:${viewerDoctorId || 'self'}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const patient = await Patient.findById(patientId).lean()
  if (!patient) throw new Error('Patient not found')

  const [prescriptions, labs, appointments] = await Promise.all([
    Prescription.find({ patientId }).sort({ createdAt: -1 }).limit(50).lean(),
    LabReport.find({ patientId }).sort({ reportDate: -1 }).limit(50).lean(),
    Appointment.find({ patientId, status: { $in: ['COMPLETED', 'IN_CONSULTATION', 'CHECKED_IN'] } }).sort({ slotStart: -1 }).limit(50).lean(),
  ])

  const adherence = computeAdherence(prescriptions)
  const labTrends = extractLabTrends(labs)
  const latestAppointment = appointments[0]
  const summary: Record<string, unknown> = {
    patient: {
      id: patient._id,
      medvaultId: patient.medvaultId,
      name: patient.fullName,
      age: computeAge(patient.dateOfBirth),
      sex: patient.sex,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies || [],
      chronicConditions: patient.chronicConditions || [],
      activeMedications: patient.activeMedications || [],
    },
    stats: {
      totalVisits: appointments.length,
      visitsLast12Months: aggregateVisitsByMonth(appointments, 12),
      topDiagnoses: aggregateDiagnoses(prescriptions),
      medicationTimeline: buildMedicationTimeline(prescriptions),
      adherence,
      lastVisitAt: latestAppointment?.slotStart,
    },
    labTrends,
    recentPrescriptions: prescriptions.slice(0, 5),
    preVisitDiagnoses: latestAppointment?.preVisitSymptoms?.aiTop3Diagnoses || [],
    aiSummaryParagraph: null,
    symptomRecurrence: null,
  }

  const aiSummary = await aiClient.summarizePatient({
    age: computeAge(patient.dateOfBirth),
    sex: patient.sex,
    allergies: patient.allergies || [],
    chronicConditions: patient.chronicConditions || [],
    activeMedications: patient.activeMedications || [],
    labTrends,
    stats: summary.stats,
    currentSymptoms: latestAppointment?.preVisitSymptoms?.rawText,
  })
  summary.aiSummaryParagraph = aiSummary.summary

  if (latestAppointment?.preVisitSymptoms?.extractedEntities?.length) {
    const recurrence = await aiClient.checkRecurrence(patientId, latestAppointment.preVisitSymptoms.extractedEntities)
    summary.symptomRecurrence = recurrence.recurring_presentations
  }

  await redis.setex(cacheKey, 300, JSON.stringify(summary))
  return summary
}
