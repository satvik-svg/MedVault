import { Doctor } from '../models/Doctor.ts'
import { Lab } from '../models/Lab.ts'
import type { ILabReport } from '../models/LabReport.ts'
import { Patient } from '../models/Patient.ts'
import { sendWhatsApp, sendWhatsAppCritical } from './notification.service.ts'

export async function deliverLabReportToDoctor(report: ILabReport): Promise<void> {
  const [patient, doctor, lab] = await Promise.all([
    Patient.findById(report.patientId),
    report.orderedByDoctorId ? Doctor.findById(report.orderedByDoctorId) : null,
    report.labId ? Lab.findById(report.labId) : null,
  ])

  if (patient) {
    const message = `Your lab report ${report.reportNumber} from ${lab?.displayName || 'MedVault lab'} is ready in MedVault.`
    if (report.hasCriticalValues) {
      await sendWhatsAppCritical(patient.contact.primaryPhone, `${message} Critical values were detected. Please contact your doctor.`)
    } else {
      await sendWhatsApp(patient.contact.primaryPhone, message)
    }
  }

  if (doctor && report.hasCriticalValues) {
    if (doctor.practice.phone) {
      await sendWhatsApp(doctor.practice.phone, `Critical lab report ${report.reportNumber} is ready for patient ${patient?.fullName || report.patientId.toString()}.`)
    }
  }
}
