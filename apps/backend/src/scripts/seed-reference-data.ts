import fs from 'node:fs/promises'
import path from 'node:path'
import { connectDatabase } from '../config/db.ts'
import { RefDrug } from '../models/RefDrug.ts'
import { RefInteraction } from '../models/RefInteraction.ts'

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error(`${filePath} must contain a JSON array`)
    return parsed as T[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function seedDrugs(dataDir: string): Promise<number> {
  const drugs = await readJsonArray<Record<string, unknown>>(path.join(dataDir, 'rxnorm_drugs.json'))
  const indiaDrugs = await readJsonArray<Record<string, unknown>>(path.join(dataDir, 'india_drugs.json'))
  const indiaByGeneric = new Map<string, Record<string, unknown>[]>()
  for (const item of indiaDrugs) {
    const genericName = String(item.genericName || item.generic || '').toLowerCase()
    if (!genericName) continue
    indiaByGeneric.set(genericName, [...(indiaByGeneric.get(genericName) || []), item])
  }

  for (const drug of drugs) {
    const genericName = String(drug.genericName || '')
    if (!genericName || !drug.rxnormCui) continue
    const indianMatches = indiaByGeneric.get(genericName.toLowerCase()) || []
    await RefDrug.updateOne(
      { rxnormCui: String(drug.rxnormCui) },
      {
        $set: {
          rxnormCui: String(drug.rxnormCui),
          genericName,
          brandNames: drug.brandNames || [],
          indianBrandNames: indianMatches.map((match) => ({
            brand: match.brand || match.brandName,
            manufacturer: match.manufacturer,
            formulations: match.formulations || [],
          })),
          drugClass: drug.drugClass,
          atcCode: drug.atcCode,
          commonStrengths: drug.commonStrengths || [],
          forms: drug.forms || [],
          routes: drug.routes || [],
          pregnancyCategory: drug.pregnancyCategory,
          renalDoseAdjust: drug.renalDoseAdjust,
          hepaticDoseAdjust: drug.hepaticDoseAdjust,
          interactingClasses: drug.interactingClasses || [],
        },
      },
      { upsert: true }
    )
  }
  return drugs.length
}

async function seedInteractions(dataDir: string): Promise<number> {
  const interactions = await readJsonArray<Record<string, unknown>>(path.join(dataDir, 'drug_interactions.json'))
  for (const interaction of interactions) {
    if (!interaction.drug1Cui || !interaction.drug2Cui) continue
    await RefInteraction.updateOne(
      { drug1Cui: String(interaction.drug1Cui), drug2Cui: String(interaction.drug2Cui) },
      {
        $set: {
          drug1Cui: String(interaction.drug1Cui),
          drug2Cui: String(interaction.drug2Cui),
          severity: interaction.severity || 'MODERATE',
          mechanism: interaction.mechanism,
          clinicalEffect: interaction.clinicalEffect,
          management: interaction.management,
          source: interaction.source || 'CURATED',
        },
      },
      { upsert: true }
    )
  }
  return interactions.length
}

async function main(): Promise<void> {
  const dataDir = process.env.REFERENCE_DATA_DIR || path.resolve(process.cwd(), '../../data/references')
  await connectDatabase()
  const [drugs, interactions] = await Promise.all([
    seedDrugs(dataDir),
    seedInteractions(dataDir),
  ])
  console.log(`Seed complete from ${dataDir}: ${drugs} drugs, ${interactions} interactions`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
