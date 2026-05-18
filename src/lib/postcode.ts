// GU21 3DY — used for SMS proximity (Woking)
const SMS_BASE_LAT = 51.3169
const SMS_BASE_LNG = -0.5574

// KT16 0AN — used for lead distance / auto-lost (Chertsey)
const LEADS_BASE_LAT = 51.3942
const LEADS_BASE_LNG = -0.5038

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

async function lookupPostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const clean = postcode.replace(/\s+/g, '').toUpperCase()
    const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
    if (!res.ok) return null
    const json = await res.json()
    const { latitude, longitude } = json.result ?? {}
    if (!latitude || !longitude) return null
    return { lat: latitude, lng: longitude }
  } catch {
    return null
  }
}

// SMS distance from GU21 3DY
export async function distanceFromBase(postcode: string): Promise<number | null> {
  const coords = await lookupPostcode(postcode)
  if (!coords) return null
  return haversineMiles(SMS_BASE_LAT, SMS_BASE_LNG, coords.lat, coords.lng)
}

// Lead distance from KT16 0AN
export async function distanceFromHQ(postcode: string): Promise<number | null> {
  const coords = await lookupPostcode(postcode)
  if (!coords) return null
  return haversineMiles(LEADS_BASE_LAT, LEADS_BASE_LNG, coords.lat, coords.lng)
}
