// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type {
  Asset,
  Auction,
  Bid,
  Category,
  Listing,
  ShippingOption,
} from '@/types'
import type { AccountSummary } from '@/types/accounts'
import { naturalCompare, useAuthStore } from '@mochi/web'
import { client, sayUnsent, type keepalive } from './client'
import { endpoints } from './endpoints'

interface SearchParams {
  query?: string
  category?: string
  type?: string
  condition?: string
  pricing?: string
  currency?: string
  min?: number
  max?: number
  delivery?: string
  location?: string
  sort?: string
  page?: number
  limit?: number
  after?: string
}

interface SearchResponse {
  listings: Listing[]
  total: number
  limit: number
  offset: number
  next?: string
}

export interface ListingDetailResponse {
  listing: Listing
  shipping: ShippingOption[]
  assets: Asset[]
  seller: AccountSummary
  auction: Auction | null
  bids: Bid[]
  threads: number
  my_order: { id: string; status: string } | null
  my_reservation: { id: string; type: string; created: number } | null
  my_subscription: { id: string; status: string } | null
  appeal_pending: boolean
  warnings: Array<{ reason: string; created: number }>
  // The server's clock as it answered, from a Comptroller that sends it.
  now?: number
  // Set here, not by the server: see get.
  skew?: number
}

// clockSkew(now, asked, answered) -> seconds: How far the server's clock is
// ahead of this one, judged at the middle of the request; 0 without a clock.
export function clockSkew(
  now: number | undefined,
  asked: number,
  answered: number
): number {
  if (typeof now !== 'number' || !Number.isFinite(now) || now <= 0) return 0
  return now - Math.round((asked + answered) / 2)
}

interface RelistAuction {
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

// Public endpoints never carry personalisation (an anonymous request runs
// server-side as the host owner); logged-in viewers use the viewer endpoints.
const authenticated = () => useAuthStore.getState().isAuthenticated

export const listingsApi = {
  search: (params: SearchParams) =>
    client
      .post<{ data: SearchResponse }>(
        authenticated()
          ? endpoints.listings.viewerSearch
          : endpoints.listings.search,
        params
      )
      .then((r) => r.data),

  // Shipping comes in the server's own order: a page sorts it by the region
  // names its reader sees. skew is the server's clock less this one's, in
  // seconds, for counting down to the server's close of an auction.
  get: (id: string) => {
    const asked = Math.floor(Date.now() / 1000)
    return client
      .post<{ data: ListingDetailResponse }>(
        authenticated() ? endpoints.listings.viewerGet : endpoints.listings.get,
        { id }
      )
      .then((r) => ({
        ...r.data,
        skew: clockSkew(r.data.now, asked, Math.floor(Date.now() / 1000)),
      }))
  },

  // The current card of each listing a signed-in viewer can still open; one
  // that is gone is left out.
  viewerBatch: (ids: string[]) =>
    client
      .post<{ data: { listings: Listing[] } }>(endpoints.listings.viewerBatch, {
        ids: JSON.stringify(ids.slice(0, 100)),
      })
      .then((r) => r.data.listings ?? []),

  mine: (params: {
    status?: string
    query?: string
    page?: number
    limit?: number
    after?: string
  }) =>
    client
      .post<{ data: { listings: Listing[]; total: number; next?: string } }>(
        endpoints.listings.mine,
        params
      )
      .then((r) => r.data),

  create: (params: { title: string; quantity?: number }) =>
    client
      .post<{ data: Listing }>(endpoints.listings.create, params)
      .then((r) => r.data),

  update: (params: Record<string, unknown>, delivery?: typeof keepalive) =>
    client
      .post<{ data: Listing }>(endpoints.listings.update, params, delivery)
      .then((r) => r.data),

  delete: (id: string) =>
    client
      .post<{ data: unknown }>(endpoints.listings.delete, { id })
      .then((r) => r.data),

  removalCheck: (id: string) =>
    client
      .post<{ data: RemovalCheck }>(endpoints.listings.removalCheck, { id })
      .then((r) => r.data),

  publish: (params: Record<string, unknown>) =>
    client
      .post<{ data: Listing; unsent?: string[] }>(
        endpoints.listings.publish,
        params
      )
      .then((r) => sayUnsent(r).data),

  relist: (id: string) =>
    client
      .post<{ data: { listing: Listing; auction?: RelistAuction } }>(
        endpoints.listings.relist,
        { id }
      )
      .then((r) => r.data),

  appeal: (id: string, reason: string) =>
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
