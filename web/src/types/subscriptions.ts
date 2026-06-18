import type { Currency, Interval, SubscriptionStatus } from './common'

export interface Subscription {
  id: string
  listing: string
  buyer: string
  seller: string
  stripe: string
  interval: Interval
  amount: number
  currency: Currency
  status: SubscriptionStatus
  starts: number
  ends: number
  created: number
  cancelled: number
  title?: string
  listing_type?: string
  buyer_name?: string
}
