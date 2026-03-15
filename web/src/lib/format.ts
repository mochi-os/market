import { CURRENCIES } from '@/config/constants'

// Format price from minor currency units (e.g. 1500 → "£15.00")
export function formatPrice(
  amount: number,
  currency: string
): string {
  const curr = CURRENCIES.find((c) => c.value === currency)
  const symbol = curr?.symbol ?? currency.toUpperCase() + ' '
  const major = (amount / 100).toFixed(2)
  return `${symbol}${major}`
}

// Format rating from integer (e.g. 450 → 4.5)
export function formatRating(rating: number): number {
  return rating / 100
}
