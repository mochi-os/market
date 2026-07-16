// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { Bid, BidResponse } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const bidsApi = {
  place: (params: { auction: string; amount: number; ceiling?: number }) =>
    client
      .post<{ data: BidResponse }>(endpoints.bids.place, params)
      .then((r) => r.data),

  mine: (params: { status?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { bids: Bid[]; total: number } }>(
        endpoints.bids.mine,
        params
      )
      .then((r) => r.data),
}
