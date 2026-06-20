// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { InboxReview, Review, SentReview } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const reviewsApi = {
  create: (params: { order: string; rating: number; text?: string }) =>
    client
      .post<{ data: Review }>(endpoints.reviews.create, params)
      .then((r) => r.data),

  respond: (params: { id: string; response: string }) =>
    client
      .post<{ data: Review }>(endpoints.reviews.respond, params)
      .then((r) => r.data),

  account: (params: {
    id: string
    role?: string
    page?: number
    limit?: number
  }) =>
    client
      .post<{ data: { reviews: Review[]; total: number } }>(
        endpoints.reviews.account,
        params
      )
      .then((r) => r.data),

  inbox: (params: { page?: number; limit?: number } = {}) =>
    client
      .post<{ data: { reviews: InboxReview[]; total: number } }>(
        endpoints.reviews.inbox,
        params
      )
      .then((r) => r.data),

  sent: (params: { page?: number; limit?: number } = {}) =>
    client
      .post<{ data: { reviews: SentReview[]; total: number } }>(
        endpoints.reviews.sent,
        params
      )
      .then((r) => r.data),
}
