import type { Currency, DeliveryMethod, OrderStatus } from './common'

export interface Order {
  id: number
  listing: number
  buyer: string
  seller: string
  type: string
  item: number
  postage: number
  total: number
  currency: Currency
  fee: number
  payout: number
  stripe: string
  escrow: string
  release: number
  delivery: DeliveryMethod
  address_name: string
  address_line1: string
  address_line2: string
  address_city: string
  address_region: string
  address_postcode: string
  address_country: string
  option: number
  carrier: string
  tracking: string
  url: string
  downloads: number
  status: OrderStatus
  created: number
  updated: number
  shipped: number
  delivered: number
  completed: number
  title?: string
  listing_type?: string
}

export interface OrderCreateResponse {
  order: Order
  client_secret: string
  publishable_key: string
}
