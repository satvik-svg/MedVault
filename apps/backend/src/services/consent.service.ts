import { Consent } from '../models/Consent.ts'
import { ConsentRequest } from '../models/ConsentRequest.ts'
import { Patient } from '../models/Patient.ts'
import { AccessLog } from '../models/AccessLog.ts'
import { generateNonce } from '../utils/helpers.ts'
import { addHours, addMinutes } from '../utils/time.ts'
import { sendWhatsApp, sendWhatsAppSilent } from './notification.service.ts'

export type ConsentScope = 'FULL' | 'PRESCRIPTIONS' | 'LAB_REPORTS' | 'DIAGNOSES' | 'ALLERGIES_AND_CONDITIONS' | 'DEMOGRAPHICS'

export interface ConsentDecision {
  decision: 'APPROVED_AUTO' | 'APPROVED_AUTO_RENEWED' | 'PENDING_PATIENT_APPROVAL'
  consent?: unknown
  requestId?: string
}

function includesRequiredScope(activeScope: string[], requiredScope: string[]): boolean {
  return activeScope.includes('FULL') || requiredScope.every((scope) => activeScope.includes(scope))
}

export async function assertActiveConsent(
  patientId: string,
  granteeUserId: string,
  scope: ConsentScope[]
): Promise<void> {
  const consent = await Consent.findOne({
    patientId,
    granteeUserId,
    status: 'ACTIVE',
    expiresAt: { $gt: new Date() },
  })

  if (!consent || !includesRequiredScope(consent.scope, scope)) {
    throw new Error('Active patient consent is required')
  }
}

export async function checkOrRequestConsent(
  patientId: string,
  granteeUserId: string,
  context: {
    scope: ConsentScope[]
    purpose: 'CONSULTATION' | 'LAB_REVIEW' | 'PHARMACY_FULFILLMENT' | 'EMERGENCY' | 'OTHER'
    granteeType?: 'DOCTOR' | 'LAB' | 'PHARMACY'
  }
): Promise<ConsentDecision> {
  const patient = await Patient.findById(patientId)
  if (!patient) throw new Error('Patient not found')

  const activeConsent = await Consent.findOne({
    patientId,
    granteeUserId,
    status: 'ACTIVE',
    expiresAt: { $gt: new Date() },
  })

  if (activeConsent && includesRequiredScope(activeConsent.scope, context.scope)) {
    await sendWhatsAppSilent(patient.contact.primaryPhone, 'Your MedVault records were accessed by a previously approved care provider.')
    await AccessLog.create({
      actorUserId: granteeUserId,
      action: 'VIEW_PATIENT',
      patientId,
      consentId: activeConsent._id,
    })
    return { decision: 'APPROVED_AUTO', consent: activeConsent }
  }

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const recentConsent = await Consent.findOne({
    patientId,
    granteeUserId,
    status: { $in: ['EXPIRED', 'AUTO_RENEWED', 'REVOKED'] },
    grantedAt: { $gt: sixMonthsAgo },
  }).sort({ grantedAt: -1 })

  if (recentConsent && context.purpose === 'CONSULTATION') {
    const renewed = await Consent.create({
      patientId,
      granteeUserId,
      granteeType: context.granteeType || 'DOCTOR',
      scope: context.scope,
      grantedAt: new Date(),
      expiresAt: addHours(new Date(), 4),
      status: 'ACTIVE',
      grantMethod: 'AUTO_RECENT_DOCTOR',
      nonce: generateNonce(),
    })
    await sendWhatsApp(patient.contact.primaryPhone, 'A recently approved doctor is viewing your MedVault records for this consultation. You can revoke access from your MedVault app.')
    return { decision: 'APPROVED_AUTO_RENEWED', consent: renewed }
  }

  const request = await ConsentRequest.create({
    patientId,
    granteeUserId,
    granteeType: context.granteeType || 'DOCTOR',
    scope: context.scope,
    purpose: context.purpose,
    status: 'PENDING',
    expiresAt: addMinutes(new Date(), 5),
    nonce: generateNonce(),
  })

  await AccessLog.create({
    actorUserId: granteeUserId,
    action: 'CONSENT_REQUEST',
    patientId,
    targetType: 'ConsentRequest',
    targetId: request._id,
  })

  await sendWhatsApp(patient.contact.primaryPhone, 'A provider is requesting access to your MedVault records. Open MedVault to approve or deny this request.')
  return { decision: 'PENDING_PATIENT_APPROVAL', requestId: request._id.toString() }
}

export async function resolveConsentRequest(
  requestId: string,
  patientId: string,
  approved: boolean
): Promise<unknown> {
  const request = await ConsentRequest.findOne({ _id: requestId, patientId, status: 'PENDING' })
  if (!request || request.expiresAt < new Date()) {
    if (request) {
      request.status = 'EXPIRED'
      await request.save()
    }
    throw new Error('Consent request not found or expired')
  }

  request.status = approved ? 'APPROVED' : 'DENIED'
  request.resolvedAt = new Date()
  await request.save()

  if (!approved) {
    await AccessLog.create({
      actorUserId: request.granteeUserId,
      action: 'CONSENT_REVOKE',
      patientId,
      targetType: 'ConsentRequest',
      targetId: request._id,
    })
    return { approved: false }
  }

  const consent = await Consent.create({
    patientId,
    granteeUserId: request.granteeUserId,
    granteeType: request.granteeType,
    scope: request.scope,
    grantedAt: new Date(),
    expiresAt: addHours(new Date(), 4),
    status: 'ACTIVE',
    grantMethod: 'EXPLICIT_WHATSAPP',
    nonce: generateNonce(),
  })

  await AccessLog.create({
    actorUserId: request.granteeUserId,
    action: 'CONSENT_GRANT',
    patientId,
    consentId: consent._id,
  })

  return { approved: true, consent }
}
