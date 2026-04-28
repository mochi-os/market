import type {
  Condition,
  Currency,
  Interval,
  ListingStatus,
  ListingType,
  PricingModel,
} from './common'

export interface Listing {
  id: number
  seller: string
  title: string
  description: string
  category: number
  tags: string
  condition: Condition
  type: ListingType
  pricing: PricingModel
  price: number
  currency: Currency
  interval: Interval
  pickup: number
  shipping: number
  location: string
  information: string
  quantity: number
  score: number
  factors: string
  moderation: string
  moderator: string
  moderated: number
  notes: string
  status: ListingStatus
  created: number
  updated: number
  photo?: Photo | null
  seller_name?: string
  seller_rating?: number
  seller_reviews?: number
  seller_onboarded?: number
}

export interface Photo {
  id: string
  object: string
  name: string
  size: number
  content_type: string
  rank: number
  created: number
  image: boolean
  url: string
  thumbnail_url?: string
}

export interface Asset {
  id: number
  listing: number
  hosting: string
  filename: string
  size: number
  mime: string
  position: number
}

export interface ShippingOption {
  id: number
  listing: number
  region: string
  price: number
  currency: string
  days: string
  notes: string
}

export interface Category {
  id: number
  parent: number
  name: string
  slug: string
  icon: string
  digital: number
  physical: number
  position: number
  active: number
  children: number
}
