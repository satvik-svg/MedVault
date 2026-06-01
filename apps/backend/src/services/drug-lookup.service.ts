import { RefDrug } from '../models/RefDrug.ts'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function scoreDrug(query: string, drug: { genericName?: string; brandNames?: string[]; indianBrandNames?: Array<{ brand?: string }> }): number {
  const q = normalize(query)
  const candidates = [
    drug.genericName,
    ...(drug.brandNames || []),
    ...(drug.indianBrandNames || []).map((brand) => brand.brand),
  ].filter(Boolean).map((candidate) => normalize(candidate || ''))

  if (candidates.some((candidate) => candidate === q)) return 1
  if (candidates.some((candidate) => candidate.startsWith(q))) return 0.9
  if (candidates.some((candidate) => candidate.includes(q))) return 0.75
  return 0.5
}

export async function searchDrugs(query: string, limit = 10): Promise<Array<Record<string, unknown>>> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const escaped = escapeRegExp(trimmed)
  const regex = new RegExp(escaped, 'i')
  const drugs = await RefDrug.find({
    $or: [
      { genericName: regex },
      { brandNames: regex },
      { 'indianBrandNames.brand': regex },
    ],
  }).limit(limit).lean()

  return drugs
    .map((drug) => ({
      ...drug,
      matchScore: scoreDrug(trimmed, drug),
      isIndianBrand: (drug.indianBrandNames || []).some((brand: any) => regex.test(brand.brand || '')),
    }))
    .sort((a, b) => Number(b.matchScore) - Number(a.matchScore))
}

export async function lookupDrugByCui(rxnormCui: string): Promise<Record<string, unknown> | null> {
  return RefDrug.findOne({ rxnormCui }).lean()
}
