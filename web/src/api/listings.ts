import type {
  Asset,
  Auction,
  Category,
  Listing,
  ShippingOption,
} from '@/types'
import type { AccountSummary } from '@/types/accounts'
import { client } from './client'
import { endpoints } from './endpoints'

export interface SearchParams {
  query?: string
  category?: number
  type?: string
  condition?: string
  pricing?: string
  min?: number
  max?: number
  delivery?: string
  location?: string
  sort?: string
  page?: number
  limit?: number
}

export interface SearchResponse {
  listings: Listing[]
  total: number
  limit: number
  offset: number
}

export interface ListingDetailResponse {
  listing: Listing
  shipping: ShippingOption[]
  assets: Asset[]
  seller: AccountSummary
  auction: Auction | null
}

export const listingsApi = {
  search: (params: SearchParams) =>
    client
      .post<{ data: SearchResponse }>(endpoints.listings.search, params)
      .then((r) => r.data),

  get: (id: number) =>
    client
      .post<{ data: ListingDetailResponse }>(endpoints.listings.get, { id })
      .then((r) => r.data),

  mine: (params: { status?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { listings: Listing[]; total: number } }>(
        endpoints.listings.mine,
        params
      )
      .then((r) => r.data),

  create: (params: { title: string }) =>
    client
      .post<{ data: Listing }>(endpoints.listings.create, params)
      .then((r) => r.data),

  update: (params: Record<string, unknown>) =>
    client
      .post<{ data: Listing }>(endpoints.listings.update, params)
      .then((r) => r.data),

  delete: (id: number) =>
    client
      .post<{ data: unknown }>(endpoints.listings.delete, { id })
      .then((r) => r.data),

  publish: (params: Record<string, unknown>) =>
    client
      .post<{ data: Listing }>(endpoints.listings.publish, params)
      .then((r) => r.data),
}

export const categoriesApi = {
  list: () =>
    client
      .post<{ data: Category[] }>(endpoints.categories.list, {})
      .then((r) => r.data),
}
