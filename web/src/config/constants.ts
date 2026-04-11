export const MARKET_SERVER_URL = 'https://mochi-os.org'

export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' },
] as const

export const LISTING_TYPES = [
  { value: 'physical', label: 'Physical' },
  { value: 'digital', label: 'Digital' },
] as const

export const LISTING_TYPE_FILTERS = [
  { value: 'physical', label: 'Physical' },
  { value: 'digital', label: 'Digital' },
] as const

export const PRICING_MODELS = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'pwyw', label: 'Pay what you want' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'auction', label: 'Auction' },
] as const

export const DELIVERY_METHODS = [
  { value: 'shipping', label: 'Shipping' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'download', label: 'Download' },
] as const

export const CURRENCIES = [
  { value: 'gbp', label: 'GBP', symbol: '\u00a3' },
  { value: 'usd', label: 'USD', symbol: '$' },
  { value: 'eur', label: 'EUR', symbol: '\u20ac' },
] as const

export const INTERVALS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const

export const AUCTION_DURATIONS = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '5', label: '5 days' },
  { value: '7', label: '7 days' },
  { value: '10', label: '10 days' },
  { value: '14', label: '14 days' },
] as const

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
  { value: 'rating', label: 'Seller rating' },
] as const

export const DISPUTE_REASONS = [
  { value: 'not_received', label: 'Not received' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'unauthorised', label: 'Unauthorised' },
  { value: 'other', label: 'Other' },
] as const
