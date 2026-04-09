import { CURRENCIES } from '@/config/constants'
import { formatNumber, type NumberFormat } from '@mochi/web'

// Format price from minor currency units (e.g. 1500 → "£15.00")
export function formatPrice(
  amount: number,
  currency: string,
  numberFmt?: NumberFormat
): string {
  const curr = CURRENCIES.find((c) => c.value === currency)
  const symbol = curr?.symbol ?? currency.toUpperCase() + ' '
  return `${symbol}${formatNumber(amount / 100, numberFmt ?? '1,000.00', 2)}`
}

// Format rating from integer (e.g. 450 → 4.5)
export function formatRating(rating: number): number {
  return rating / 100
}

// Parse location from JSON string or plain text
export interface LocationData {
  name: string
  lat: number
  lon: number
  category?: string
}

export function parseLocation(location: string): LocationData | null {
  if (!location) return null
  try {
    const data = JSON.parse(location)
    if (data.name && typeof data.lat === 'number' && typeof data.lon === 'number') {
      return data as LocationData
    }
  } catch {
    // Plain text fallback
  }
  return { name: location, lat: 0, lon: 0 }
}

export function locationName(location: string): string {
  const data = parseLocation(location)
  return data?.name ?? ''
}
