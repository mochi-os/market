import type { Subscription } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const subscriptionsApi = {
  create: (listing: number) =>
    client
      .post<{ data: Subscription }>(endpoints.subscriptions.create, {
        listing,
      })
      .then((r) => r.data),

  mine: (params: { status?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { subscriptions: Subscription[]; total: number } }>(
        endpoints.subscriptions.mine,
        params
      )
      .then((r) => r.data),

  subscribers: (params: {
    listing?: number
    status?: string
    page?: number
    limit?: number
  }) =>
    client
      .post<{ data: { subscriptions: Subscription[]; total: number } }>(
        endpoints.subscriptions.subscribers,
        params
      )
      .then((r) => r.data),

  cancel: (id: number) =>
    client
      .post<{ data: Subscription }>(endpoints.subscriptions.cancel, { id })
      .then((r) => r.data),

  pause: (id: number) =>
    client
      .post<{ data: Subscription }>(endpoints.subscriptions.pause, { id })
      .then((r) => r.data),

  resume: (id: number) =>
    client
      .post<{ data: Subscription }>(endpoints.subscriptions.resume, { id })
      .then((r) => r.data),
}
