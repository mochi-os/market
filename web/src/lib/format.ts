import { CURRENCIES_DATA } from '@/config/constants'
import { useFormat } from '@mochi/web'

export function currencyDecimals(currency: string): number {
  return CURRENCIES_DATA.find((c) => c.value === currency)?.decimals ?? 2
}

export function toMinorUnits(amount: number | string, currency: string): number {
  const factor = 10 ** currencyDecimals(currency)
  return Math.round(Number(amount) * factor)
}

export function fromMinorUnits(minor: number, currency: string): number {
  const factor = 10 ** currencyDecimals(currency)
  return minor / factor
}

// Validate a price-input string for the given currency: digits + optional decimals.
export function priceRegex(currency: string): RegExp {
  const dec = currencyDecimals(currency)
  return dec === 0 ? /^\d*$/ : new RegExp(`^\\d*\\.?\\d{0,${dec}}$`)
}

// Truncate fractional digits when switching to a zero-decimal currency.
export function coerceForCurrency(value: string, currency: string): string {
  if (!value) return value
  if (currencyDecimals(currency) === 0) {
    const dot = value.indexOf('.')
    return dot >= 0 ? value.slice(0, dot) : value
  }
  return value
}

export function useFormatPrice() {
  const { formatNumber } = useFormat()
  return (amount: number, currency: string): string => {
    const curr = CURRENCIES_DATA.find((c) => c.value === currency)
    const symbol = curr?.symbol ?? currency.toUpperCase() + ' '
    const decimals = curr?.decimals ?? 2
    return `${symbol}${formatNumber(amount / (10 ** decimals), decimals)}`
  }
}

// Format rating from integer (e.g. 450 → 4.5)
export function formatRating(rating: number): number {
  return rating / 100
}

// Format an entity ID as a 9-char fingerprint with hyphens: xxx-xxx-xxx
export function formatFingerprint(id: string): string {
  const fp = id.slice(0, 9)
  return `${fp.slice(0, 3)}-${fp.slice(3, 6)}-${fp.slice(6, 9)}`
}

// Best-effort JSON parse: returns the parsed value, or the fallback on null/empty input or malformed JSON.
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
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
  const parsed = safeJsonParse<{ name?: unknown; lat?: unknown; lon?: unknown } | null>(
    location,
    null,
  )
  if (parsed && parsed.name && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
    return parsed as LocationData
  }
  return { name: location, lat: 0, lon: 0 }
}

export function locationName(location: string): string {
  const data = parseLocation(location)
  return data?.name ?? ''
}
