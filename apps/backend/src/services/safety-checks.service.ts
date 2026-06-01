import { Patient, type IPatient } from '../models/Patient.ts'
import { RefDrug } from '../models/RefDrug.ts'
import { RefInteraction } from '../models/RefInteraction.ts'

export interface MedicationInput {
  rxnormCui: string
  genericName?: string
  brandName?: string
  strength?: string
}

export interface MedicationSafetyResult {
  allergyChecked: boolean
  allergyConflict: boolean
  allergyDetails?: string
  interactionChecked: boolean
  interactionConflicts: Array<{
    withDrugCui: string
    withDrugName?: string
    severity?: string
    managementNote?: string
    overriddenByDoctor?: boolean
    overrideReason?: string
  }>
  duplicateTherapyChecked: boolean
  duplicateTherapyDetected: boolean
  duplicateTherapyDetails?: string
  doseAdjustmentChecked: boolean
  doseAdjustmentRecommended: boolean
  doseAdjustmentReason?: string
}

function textIncludes(haystack: string | undefined, needle: string | undefined): boolean {
  if (!haystack || !needle) return false
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export async function runMedicationSafetyChecks(
  medication: MedicationInput,
  patientOrId: IPatient | string
): Promise<MedicationSafetyResult> {
  const patient = typeof patientOrId === 'string'
    ? await Patient.findById(patientOrId)
    : patientOrId
  if (!patient) throw new Error('Patient not found')

  const drug = await RefDrug.findOne({ rxnormCui: medication.rxnormCui }).lean()
  const genericName = drug?.genericName || medication.genericName || ''
  const drugClass = drug?.drugClass || ''

  const result: MedicationSafetyResult = {
    allergyChecked: true,
    allergyConflict: false,
    interactionChecked: true,
    interactionConflicts: [],
    duplicateTherapyChecked: true,
    duplicateTherapyDetected: false,
    doseAdjustmentChecked: true,
    doseAdjustmentRecommended: false,
  }

  for (const allergy of patient.allergies || []) {
    const allergen = allergy.allergen
    if (
      textIncludes(genericName, allergen)
      || textIncludes(drugClass, allergen)
      || (drug?.brandNames || []).some((brand: any) => textIncludes(brand, allergen))
      || (drug?.indianBrandNames || []).some((brand: any) => textIncludes(brand.brand, allergen))
    ) {
      result.allergyConflict = true
      result.allergyDetails = `Patient has ${allergy.severity?.toLowerCase() || 'documented'} allergy to ${allergen}. ${genericName || medication.rxnormCui} matches this allergy or drug class.`
      break
    }
  }

  const activeMedications = patient.activeMedications || []
  for (const activeMedication of activeMedications) {
    if (!activeMedication.rxnormCui || activeMedication.rxnormCui === medication.rxnormCui) continue

    const interaction = await RefInteraction.findOne({
      $or: [
        { drug1Cui: medication.rxnormCui, drug2Cui: activeMedication.rxnormCui },
        { drug1Cui: activeMedication.rxnormCui, drug2Cui: medication.rxnormCui },
      ],
    }).lean()

    if (interaction) {
      result.interactionConflicts.push({
        withDrugCui: activeMedication.rxnormCui,
        withDrugName: activeMedication.displayName,
        severity: interaction.severity,
        managementNote: interaction.management || interaction.clinicalEffect,
      })
    }
  }

  if (drugClass) {
    for (const activeMedication of activeMedications) {
      if (activeMedication.rxnormCui === medication.rxnormCui) continue
      if (activeMedication.drugClass && activeMedication.drugClass === drugClass) {
        result.duplicateTherapyDetected = true
        result.duplicateTherapyDetails = `Patient is already on ${activeMedication.displayName} from the same drug class (${drugClass}).`
        break
      }
    }
  }

  const renalCondition = (patient.chronicConditions || []).find((condition: any) => /^N18\./.test(condition.icd10Code))
  if (renalCondition && drug?.renalDoseAdjust?.required) {
    result.doseAdjustmentRecommended = true
    result.doseAdjustmentReason = `Patient has CKD (${renalCondition.displayName || renalCondition.icd10Code}). ${drug.renalDoseAdjust.notes || 'Renal dose adjustment may be required.'}`
  }

  const hepaticCondition = (patient.chronicConditions || []).find((condition: any) => condition.icd10Code.startsWith('K7'))
  if (hepaticCondition && drug?.hepaticDoseAdjust?.required) {
    result.doseAdjustmentRecommended = true
    result.doseAdjustmentReason = [
      result.doseAdjustmentReason,
      `Patient has hepatic condition (${hepaticCondition.displayName || hepaticCondition.icd10Code}). ${drug.hepaticDoseAdjust.notes || 'Hepatic dose adjustment may be required.'}`,
    ].filter(Boolean).join(' ')
  }

  return result
}

export function hasBlockingSafetyIssue(result: MedicationSafetyResult): boolean {
  return result.allergyConflict
    || result.interactionConflicts.some((conflict) => conflict.severity === 'CONTRAINDICATED')
}
