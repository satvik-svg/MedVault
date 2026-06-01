import { Doctor } from '../models/Doctor.ts'
import { Lab, type ILab } from '../models/Lab.ts'

export interface LabDiscoveryParams {
  city: string
  loincCodes?: string[]
  doctorId?: string
  openNow?: boolean
  geoNear?: { lat: number; lng: number; maxKm: number }
}

function getCurrentOpenStatus(lab: ILab): { isOpen: boolean; closesAt?: string; opensAt?: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const today = lab.operatingHours?.find((hours) => hours.dayOfWeek === dayOfWeek)
  if (!today || today.isClosed || !today.open || !today.close) return { isOpen: false, opensAt: today?.open }
  return { isOpen: currentHHMM >= today.open && currentHHMM <= today.close, closesAt: today.close, opensAt: today.open }
}

function haversineKm(from: { lat: number; lng: number }, coordinates?: number[]): number | null {
  if (!coordinates || coordinates.length < 2) return null
  const [lng, lat] = coordinates
  const toRad = (value: number) => value * Math.PI / 180
  const earthKm = 6371
  const dLat = toRad(lat - from.lat)
  const dLng = toRad(lng - from.lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function discoverLabs(params: LabDiscoveryParams): Promise<unknown[]> {
  const query: Record<string, unknown> = {
    isActive: true,
    trustLevel: 'VERIFIED',
    'address.city': new RegExp(`^${params.city}$`, 'i'),
  }
  if (params.loincCodes?.length) query['testsOffered.loincCode'] = { $all: params.loincCodes }
  if (params.geoNear) {
    query['address.geoLocation'] = {
      $near: {
        $geometry: { type: 'Point', coordinates: [params.geoNear.lng, params.geoNear.lat] },
        $maxDistance: params.geoNear.maxKm * 1000,
      },
    }
  }

  let labs = await Lab.find(query).limit(50)

  if (params.openNow) {
    labs = labs.filter((lab) => getCurrentOpenStatus(lab).isOpen)
  }

  let favorites: string[] = []
  if (params.doctorId) {
    const doctor = await Doctor.findById(params.doctorId).select('preferredLabIds')
    favorites = (doctor?.preferredLabIds || []).map((id) => id.toString())
  }

  const results = labs.map((lab) => {
    const matchingTests = params.loincCodes?.length
      ? lab.testsOffered.filter((test) => test.loincCode && params.loincCodes?.includes(test.loincCode))
      : lab.testsOffered
    const totalEstimatedPrice = matchingTests.reduce((sum, test) => sum + (test.price || 0), 0)
    const distance = params.geoNear ? haversineKm(params.geoNear, lab.address.geoLocation?.coordinates) : null

    return {
      labId: lab._id,
      displayName: lab.displayName,
      address: lab.address,
      phone: lab.phone,
      logoUrl: lab.logoUrl,
      isFavoriteOfDoctor: favorites.includes(lab._id.toString()),
      currentStatus: getCurrentOpenStatus(lab),
      pricing: {
        totalEstimatedPrice,
        perTest: matchingTests.map((test) => ({
          loincCode: test.loincCode,
          name: test.displayName,
          price: test.price,
        })),
      },
      turnaroundTime: { maxHours: Math.max(0, ...matchingTests.map((test) => test.tatHours || 0)) },
      homeCollection: {
        available: lab.homeCollectionAvailable,
        charge: lab.homeCollectionCharge,
      },
      distance,
      trustSignals: {
        nablAccredited: !!lab.nablAccreditationNumber && lab.verification.nablVerified,
        verifiedByPlatform: lab.trustLevel === 'VERIFIED',
        onTimeRate: lab.stats?.onTimeRate,
      },
      stats: {
        avgTurnaroundHours: lab.stats?.avgTurnaroundHours,
        totalOrdersDelivered: lab.stats?.totalReportsUploaded,
      },
    }
  })

  results.sort((a, b) => {
    if (a.isFavoriteOfDoctor && !b.isFavoriteOfDoctor) return -1
    if (!a.isFavoriteOfDoctor && b.isFavoriteOfDoctor) return 1
    if (a.distance != null && b.distance != null) return a.distance - b.distance
    return a.pricing.totalEstimatedPrice - b.pricing.totalEstimatedPrice
  })
  return results
}
