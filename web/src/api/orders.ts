import type { Asset, Listing, Order, OrderCreateResponse } from '@/types'
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

  get: (id: number) =>
    client
      .post<{
        data: {
          order: Order
          listing: Listing
          assets: Asset[]
          dispute: Dispute | null
        }
      }>(endpoints.orders.get, { id })
      .then((r) => r.data),

  resume: (params: { id: number; success_url: string; cancel_url: string }) =>
    client
      .post<{ data: { order: Order; checkout_url: string } }>(
        endpoints.orders.resume,
        params
      )
      .then((r) => r.data),

  ship: (params: {
    id: number
    carrier?: string
    tracking?: string
    url?: string
  }) =>
    client
      .post<{ data: Order }>(endpoints.orders.ship, params)
      .then((r) => r.data),

  confirm: (id: number) =>
    client
      .post<{ data: Order }>(endpoints.orders.confirm, { id })
      .then((r) => r.data),

  refund: (params: { id: number; reason?: string; description?: string }) =>
    client
      .post<{ data: { order: Order } }>(endpoints.orders.refund, params)
      .then((r) => r.data),
}
