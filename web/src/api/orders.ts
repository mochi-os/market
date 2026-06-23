// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { Asset, Listing, Order, OrderCreateResponse, Review } from '@/types'
import type { Dispute } from './disputes'
import { client } from './client'
import { endpoints } from './endpoints'

export const ordersApi = {
  create: (params: Record<string, unknown>) =>
    client
      .post<{ data: OrderCreateResponse }>(endpoints.orders.create, params)
      .then((r) => r.data),

  auction: (params: Record<string, unknown>) =>
    client
      .post<{ data: OrderCreateResponse }>(endpoints.orders.auction, params)
      .then((r) => r.data),

  purchases: (params: { status?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { orders: Order[]; total: number } }>(
        endpoints.orders.purchases,
        params
      )
      .then((r) => r.data),

  sales: (params: { status?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { orders: Order[]; total: number } }>(
        endpoints.orders.sales,
        params
      )
      .then((r) => r.data),

  get: (id: string) =>
    client
      .post<{
        data: {
          order: Order
          listing: Listing
          assets: Asset[]
          dispute: Dispute | null
          review: Review | null
          peer_review: (Review & { reviewer_name?: string }) | null
          can_review: boolean
        }
      }>(endpoints.orders.get, { id })
      .then((r) => r.data),

  ship: (params: {
    id: string
    carrier?: string
    tracking?: string
    url?: string
  }) =>
    client
      .post<{ data: Order }>(endpoints.orders.ship, params)
      .then((r) => r.data),

  confirm: (id: string) =>
    client
      .post<{ data: Order }>(endpoints.orders.confirm, { id })
      .then((r) => r.data),

  dispute: (params: { id: string; reason?: string; description?: string }) =>
    client
      .post<{ data: { order: Order } }>(endpoints.orders.dispute, params)
      .then((r) => r.data),

  refund: (params: { id: string; amount?: number; reason?: string }) =>
    client
      .post<{ data: { order: Order; dispute: Dispute | null } }>(
        endpoints.orders.refund,
        params
      )
      .then((r) => r.data),
}

export const reservationsApi = {
  // Cancel an in-progress checkout for a listing, releasing the reservation
  cancel: (listing: string) =>
    client
      .post<{ data: unknown }>(endpoints.reservations.cancel, { listing })
      .then((r) => r.data),
}
