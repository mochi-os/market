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

// `minimum` is Stripe's minimum charge in minor units.
// https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts
export const CURRENCIES = [
  { value: 'eur', label: 'Euro', symbol: '\u20ac', decimals: 2, minimum: 50 },
  { value: 'jpy', label: 'Japanese yen', symbol: '\u00a5', decimals: 0, minimum: 50 },
  { value: 'gbp', label: 'UK pound', symbol: '\u00a3', decimals: 2, minimum: 30 },
  { value: 'usd', label: 'US dollar', symbol: '$', decimals: 2, minimum: 50 },
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

// Stripe chargeback reasons (per Stripe docs). Used when dispute.opener === 'stripe'.
export const STRIPE_CHARGEBACK_REASONS: Record<string, string> = {
  bank_cannot_process: 'Bank could not process',
  check_returned: 'Check returned',
  credit_not_processed: 'Credit not processed',
  customer_initiated: 'Customer initiated',
  debit_not_authorized: 'Debit not authorised',
  duplicate: 'Duplicate charge',
  fraudulent: 'Fraudulent',
  general: 'General',
  incorrect_account_details: 'Incorrect account details',
  insufficient_funds: 'Insufficient funds',
  product_not_received: 'Product not received',
  product_unacceptable: 'Product unacceptable',
  subscription_canceled: 'Subscription cancelled',
  unrecognized: 'Unrecognised charge',
}

export const REPORT_REASONS = [
  { value: 'prohibited', label: 'Prohibited or illegal item' },
  { value: 'counterfeit', label: 'Counterfeit or stolen' },
  { value: 'misleading', label: 'Misleading description' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'other', label: 'Other' },
] as const
