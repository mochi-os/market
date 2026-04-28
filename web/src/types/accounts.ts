export interface Account {
  id: string
  name: string
  biography: string
  business: number
  company: string
  vat: string
  address_name: string
  address_line1: string
  address_line2: string
  address_city: string
  address_region: string
  address_postcode: string
  address_country: string
  location: string
  seller: number
  stripe: string
  onboarded: number
  verified: number
  status: string
  reason: string
  rating: number
  reviews: number
  sales: number
  created: number
  updated: number
}

export interface AccountSummary {
  id: string
  name: string
  location: string
  status?: string
  verified?: number
  onboarded?: number
  rating: number
  reviews: number
  sales: number
  created: number
}

export interface Fees {
  platform: number
}
