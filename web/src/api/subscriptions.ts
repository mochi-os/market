// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { Subscription } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const subscriptionsApi = {
  create: (params: { listing: string; success_url: string; cancel_url: string }) =>
    client
      .post<{ data: { subscription: Subscription; checkout_url: string } }>(
        endpoints.subscriptions.create,
        params,
      )
      .then((r) => r.data),

  mine: (params: { status?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { subscriptions: Subscription[]; total: number } }>(
        endpoints.subscriptions.mine,
        params
      )
      .then((r) => r.data),

  subscribers: (params: {
    listing?: string
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

  cancel: (id: string) =>
    client
      .post<{ data: Subscription }>(endpoints.subscriptions.cancel, { id })
      .then((r) => r.data),

  pause: (id: string) =>
    client
      .post<{ data: Subscription }>(endpoints.subscriptions.pause, { id })
      .then((r) => r.data),

  resume: (id: string) =>
    client
      .post<{ data: Subscription }>(endpoints.subscriptions.resume, { id })
      .then((r) => r.data),

  reactivate: (id: string) =>
    client
      .post<{ data: Subscription }>(endpoints.subscriptions.reactivate, { id })
      .then((r) => r.data),
}
