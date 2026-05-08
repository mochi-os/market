import { useLingui } from '@lingui/react/macro'

export function useConditions() {
  const { t } = useLingui()
  return [
    { value: 'new' as const, label: t`New` },
    { value: 'used' as const, label: t`Used` },
    { value: 'refurbished' as const, label: t`Refurbished` },
  ]
}

export function useListingTypes() {
  const { t } = useLingui()
  return [
    { value: 'physical' as const, label: t`Physical` },
    { value: 'digital' as const, label: t`Digital` },
  ]
}

export function useListingTypeFilters() {
  const { t } = useLingui()
  return [
    { value: 'physical' as const, label: t`Physical` },
    { value: 'digital' as const, label: t`Digital` },
  ]
}

export function usePricingModels() {
  const { t } = useLingui()
  return [
    { value: 'fixed' as const, label: t`Fixed price` },
    { value: 'pwyw' as const, label: t`Pay what you want` },
    { value: 'subscription' as const, label: t`Subscription` },
    { value: 'auction' as const, label: t`Auction` },
  ]
}

export function useDeliveryMethods() {
  const { t } = useLingui()
  return [
    { value: 'shipping' as const, label: t`Shipping` },
    { value: 'pickup' as const, label: t`Pickup` },
    { value: 'download' as const, label: t`Download` },
  ]
}

// Currency table — kept as a static array since `value`, `symbol`,
// `decimals`, and `minimum` are protocol data; only the descriptive `label`
// needs translation. Use `useCurrencies()` below to get the localised version.
// `minimum` is Stripe's minimum charge in minor units.
// https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts
export const CURRENCIES_DATA = [
  { value: 'eur' as const, symbol: '€', decimals: 2, minimum: 50 },
  { value: 'jpy' as const, symbol: '¥', decimals: 0, minimum: 50 },
  { value: 'gbp' as const, symbol: '£', decimals: 2, minimum: 30 },
  { value: 'usd' as const, symbol: '$', decimals: 2, minimum: 50 },
]

export function useCurrencies() {
  const { t } = useLingui()
  return [
    { value: 'eur' as const, label: t`Euro`, symbol: '€', decimals: 2, minimum: 50 },
    { value: 'jpy' as const, label: t`Japanese yen`, symbol: '¥', decimals: 0, minimum: 50 },
    { value: 'gbp' as const, label: t`UK pound`, symbol: '£', decimals: 2, minimum: 30 },
    { value: 'usd' as const, label: t`US dollar`, symbol: '$', decimals: 2, minimum: 50 },
  ]
}

export function useIntervals() {
  const { t } = useLingui()
  return [
    { value: 'monthly' as const, label: t`Monthly` },
    { value: 'yearly' as const, label: t`Yearly` },
  ]
}

export function useAuctionDurations() {
  const { t } = useLingui()
  return [
    { value: '1' as const, label: t`1 day` },
    { value: '3' as const, label: t`3 days` },
    { value: '5' as const, label: t`5 days` },
    { value: '7' as const, label: t`7 days` },
    { value: '10' as const, label: t`10 days` },
    { value: '14' as const, label: t`14 days` },
  ]
}

export function useSortOptions() {
  const { t } = useLingui()
  return [
    { value: 'recent' as const, label: t`Most recent` },
    { value: 'price_low' as const, label: t`Price: low to high` },
    { value: 'price_high' as const, label: t`Price: high to low` },
    { value: 'rating' as const, label: t`Seller rating` },
  ]
}

export function useDisputeReasons() {
  const { t } = useLingui()
  return [
    { value: 'not_received' as const, label: t`Not received` },
    { value: 'not_as_described' as const, label: t`Not as described` },
    { value: 'damaged' as const, label: t`Damaged` },
    { value: 'unauthorised' as const, label: t`Unauthorised` },
    { value: 'other' as const, label: t`Other` },
  ]
}

// Stripe chargeback reasons (per Stripe docs). Used when dispute.opener === 'stripe'.
export function useStripeChargebackReasons(): Record<string, string> {
  const { t } = useLingui()
  return {
    bank_cannot_process: t`Bank could not process`,
    check_returned: t`Check returned`,
    credit_not_processed: t`Credit not processed`,
    customer_initiated: t`Customer initiated`,
    debit_not_authorized: t`Debit not authorised`,
    duplicate: t`Duplicate charge`,
    fraudulent: t`Fraudulent`,
    general: t`General`,
    incorrect_account_details: t`Incorrect account details`,
    insufficient_funds: t`Insufficient funds`,
    product_not_received: t`Product not received`,
    product_unacceptable: t`Product unacceptable`,
    subscription_canceled: t`Subscription cancelled`,
    unrecognized: t`Unrecognised charge`,
  }
}

export function useReportReasons() {
  const { t } = useLingui()
  return [
    { value: 'prohibited' as const, label: t`Prohibited or illegal item` },
    { value: 'counterfeit' as const, label: t`Counterfeit or stolen` },
    { value: 'misleading' as const, label: t`Misleading description` },
    { value: 'inappropriate' as const, label: t`Inappropriate content` },
    { value: 'spam' as const, label: t`Spam or scam` },
    { value: 'other' as const, label: t`Other` },
  ]
}
