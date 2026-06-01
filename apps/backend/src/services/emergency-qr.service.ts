import { AccessLog } from '../models/AccessLog.ts'
import { EmergencyQR, type IEmergencyQR } from '../models/EmergencyQR.ts'
import { Patient } from '../models/Patient.ts'
import { config } from '../config/env.ts'
import { addDays, computeAge } from '../utils/time.ts'
import { signPayload, toQrDataUrl, verifySignedPayload } from '../utils/qr.ts'
import { sendWhatsApp, sendWhatsAppCritical } from './notification.service.ts'

export class GeoAnomalyError extends Error {}

export interface GeoPoint {
  lat?: number
  lng?: number
  city?: string
  country?: string
  capturedAt?: Date
}

interface EmergencyPayload extends Record<string, unknown> {
  typ: 'EMERGENCY'
  pid: string
  ver: number
}

function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  if (typeof a.lat !== 'number' || typeof a.lng !== 'number' || typeof b.lat !== 'number' || typeof b.lng !== 'number') return 0
  const radiusKm = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * radiusKm * Math.asin(Math.sqrt(h))
}

export async function generateEmergencyQR(patientId: string): Promise<IEmergencyQR> {
  const patient = await Patient.findById(patientId)
  if (!patient) throw new Error('Patient not found')

  await EmergencyQR.updateMany(
    { patientId, status: 'ACTIVE' },
    {
      $set: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: 'NEW_QR_ISSUED',
        revokedBy: 'PATIENT',
      },
    }
  )

  const signed = signPayload<EmergencyPayload>({
    typ: 'EMERGENCY',
    pid: patient.medvaultId,
    ver: 1,
  }, config.qr.emergencyQrTtlDays * 86_400)
  const qrUri = `medvault://emergency/${signed.signedPayload}`

  const qr = await EmergencyQR.create({
    patientId,
    nonce: signed.payload.nonce,
    signedPayload: signed.signedPayload,
    qrImageUrl: toQrDataUrl(qrUri, 'Emergency QR'),
    issuedAt: new Date(),
    expiresAt: addDays(new Date(), config.qr.emergencyQrTtlDays),
    status: 'ACTIVE',
    patientLastKnownLocation: patient.lastKnownLocation,
  })

  await Patient.updateOne({ _id: patientId }, { $set: { activeEmergencyQrNonces: [signed.payload.nonce] } })
  await AccessLog.create({
    action: 'EMERGENCY_QR_GENERATE',
    patientId,
    targetType: 'EmergencyQR',
    targetId: qr._id,
  })
  return qr
}

export async function revokeEmergencyQR(patientId: string, nonce: string, reason = 'Patient revoked manually'): Promise<{ revoked: boolean }> {
  await EmergencyQR.updateOne(
    { patientId, nonce },
    {
      $set: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
        revokedBy: 'PATIENT',
      },
    }
  )
  await Patient.updateOne({ _id: patientId }, { $pull: { activeEmergencyQrNonces: nonce } })
  await AccessLog.create({
    action: 'CONSENT_REVOKE',
    patientId,
    targetType: 'EmergencyQR',
    metadata: { nonce, reason },
  })
  return { revoked: true }
}

export async function scanEmergencyQR(input: {
  signedPayload: string
  scannerLocation?: GeoPoint
  scannerIp?: string
  facilityName?: string
  userId?: string
}): Promise<Record<string, unknown>> {
  const payload = verifySignedPayload<EmergencyPayload>(input.signedPayload.replace('medvault://emergency/', ''))
  if (payload.typ !== 'EMERGENCY') throw new Error('Wrong QR type')

  const patient = await Patient.findOne({ medvaultId: payload.pid })
  if (!patient) throw new Error('Patient not found')
  if (!patient.activeEmergencyQrNonces?.includes(payload.nonce)) {
    throw new Error('QR has been revoked')
  }

  const qr = await EmergencyQR.findOne({ nonce: payload.nonce, status: 'ACTIVE' })
  if (!qr) throw new Error('QR is not active')

  const lastLocation = patient.lastKnownLocation
  let geoDistanceKm = 0
  let isAnomaly = false
  if (lastLocation && input.scannerLocation) {
    geoDistanceKm = haversineDistanceKm(lastLocation, input.scannerLocation)
    const capturedAt = lastLocation.capturedAt || new Date(0)
    const hoursSinceLocation = Math.max((Date.now() - capturedAt.getTime()) / 3_600_000, 1)
    const maxReasonableDistance = hoursSinceLocation * 100
    isAnomaly = geoDistanceKm > maxReasonableDistance && geoDistanceKm > 200
  }

  if (isAnomaly) {
    await EmergencyQR.updateOne(
      { nonce: payload.nonce },
      {
        $set: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedReason: `Geo-anomaly: ${Math.round(geoDistanceKm)}km from last known location`,
          revokedBy: 'SYSTEM_GEO_ANOMALY',
        },
        $push: {
          scans: {
            scannedAt: new Date(),
            scannerLocation: input.scannerLocation,
            scannerIp: input.scannerIp,
            geoDistanceKm,
            isAnomaly: true,
            accessedFields: [],
          },
        },
      }
    )
    await Patient.updateOne({ _id: patient._id }, { $pull: { activeEmergencyQrNonces: payload.nonce } })
    await sendWhatsAppCritical(patient.contact.primaryPhone, `Suspicious emergency QR scan blocked ${Math.round(geoDistanceKm)}km from your last known location. Affected QR has been revoked.`)
    throw new GeoAnomalyError('Access denied due to geographic anomaly')
  }

  const accessedFields = ['allergies', 'chronicConditions', 'activeMedications', 'bloodGroup', 'emergencyContact']
  await EmergencyQR.updateOne(
    { nonce: payload.nonce },
    {
      $push: {
        scans: {
          scannedAt: new Date(),
          scannerLocation: input.scannerLocation,
          scannerIp: input.scannerIp,
          geoDistanceKm,
          isAnomaly: false,
          accessedFields,
        },
      },
    }
  )

  await AccessLog.create({
    actorUserId: input.userId,
    actorRole: input.userId ? undefined : 'EMERGENCY_RESPONDER',
    action: 'EMERGENCY_QR_SCAN',
    patientId: patient._id,
    ip: input.scannerIp,
    geoCountry: input.scannerLocation?.country,
    geoCity: input.scannerLocation?.city,
    metadata: { nonce: payload.nonce, geoDistanceKm, facilityName: input.facilityName },
  })

  await sendWhatsApp(patient.contact.primaryPhone, `Your emergency QR was scanned${input.facilityName ? ` at ${input.facilityName}` : ''}. If this was not expected, revoke the QR from MedVault.`)

  return {
    patient: {
      name: patient.fullName,
      age: computeAge(patient.dateOfBirth),
      sex: patient.sex,
      bloodGroup: patient.bloodGroup,
      medvaultId: patient.medvaultId,
    },
    critical: {
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions.filter((condition) => condition.status === 'ACTIVE'),
      activeMedications: patient.activeMedications.map((medication) => ({
        name: medication.displayName,
        dose: medication.strength,
      })),
      emergencyContact: patient.emergencyContact,
    },
    accessExpiresIn: 4 * 60 * 60,
    scanId: `${payload.nonce}:${Date.now()}`,
  }
}

export async function sweepExpiredEmergencyQRs(): Promise<number> {
  const expired = await EmergencyQR.find({ status: 'ACTIVE', expiresAt: { $lt: new Date() } })
  for (const qr of expired) {
    await EmergencyQR.updateOne(
      { _id: qr._id },
      {
        $set: {
          status: 'EXPIRED',
          revokedAt: new Date(),
          revokedReason: 'Expired',
          revokedBy: 'SYSTEM_EXPIRY',
        },
      }
    )
    await Patient.updateOne({ _id: qr.patientId }, { $pull: { activeEmergencyQrNonces: qr.nonce } })
  }
  return expired.length
}
