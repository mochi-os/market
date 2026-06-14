import type {
  Asset,
  Auction,
  Bid,
  Category,
  Listing,
  ShippingOption,
} from '@/types'
import type { AccountSummary } from '@/types/accounts'
import { naturalCompare } from '@mochi/web'
import { client } from './client'
import { endpoints } from './endpoints'

export interface SearchParams {
  query?: string
  category?: string
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
  bids: Bid[]
  threads: number
  my_order: { id: number; status: string } | null
  my_reservation: { id: number; type: string; created: number } | null
  my_subscription: { id: number; status: string } | null
  appeal_pending: boolean
  warnings: Array<{ reason: string; created: number }>
}

export interface RelistAuction {
  reserve: number
  instant: number
  opens: number
  closes: number
  extend: number
  extension: number
}

export interface RemovalCheck {
  has_active_auction: boolean
  active_bidders: number
  active_subscribers: number
  has_active_orders: boolean
}

export const listingsApi = {
  search: (params: SearchParams) =>
    client
      .post<{ data: SearchResponse }>(endpoints.listings.search, params)
      .then((r) => r.data),

  get: (id: number) =>
    client
      .post<{ data: ListingDetailResponse }>(endpoints.listings.get, { id })
      // Server returns shipping in intrinsic order; sort by region name here.
      .then((r) => ({
        ...r.data,
        shipping: [...r.data.shipping].sort((a, b) =>
          naturalCompare(a.region, b.region)
        ),
      })),

  mine: (params: { status?: string; query?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { listings: Listing[]; total: number } }>(
        endpoints.listings.mine,
        params
      )
      .then((r) => r.data),

  create: (params: { title: string; quantity?: number }) =>
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

  removalCheck: (id: number) =>
    client
      .post<{ data: RemovalCheck }>(endpoints.listings.removalCheck, { id })
      .then((r) => r.data),

  publish: (params: Record<string, unknown>) =>
    client
      .post<{ data: Listing }>(endpoints.listings.publish, params)
      .then((r) => r.data),

  relist: (id: number) =>
    client
      .post<{ data: { listing: Listing; auction?: RelistAuction } }>(
        endpoints.listings.relist,
        { id }
      )
      .then((r) => r.data),

  appeal: (id: number, reason: string) =>
    client
      .post<{ data: Listing }>(endpoints.listings.appeal, { id, reason })
      .then((r) => r.data),
}

export const categoriesApi = {
  list: () =>
    client
      .post<{ data: Category[] }>(endpoints.categories.list, {})
      // Server orders by intrinsic `position`; sort names in the consumer
      // (locale-/accent-correct) with position as the primary key.
      .then((r) =>
        [...r.data].sort(
          (a, b) => a.position - b.position || naturalCompare(a.name, b.name)
        )
      ),
}
