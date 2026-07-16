// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { Listing } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const savedApi = {
  list: () =>
    client
      .post<{ data: { saved: Listing[]; total: number } }>(
        endpoints.saved.list,
        {},
      )
      .then((r) => r.data),

  add: (listing: Listing) =>
    client
      .post<{ data: { saved: boolean } }>(endpoints.saved.add, {
        listing: listing.id,
        data: JSON.stringify(listing),
      })
      .then((r) => r.data),

  remove: (id: string) =>
    client
      .post<{ data: { saved: boolean } }>(endpoints.saved.remove, {
        listing: id,
      })
      .then((r) => r.data),

  clear: () =>
    client
      .post<{ data: { saved: boolean } }>(endpoints.saved.clear, {})
      .then((r) => r.data),
}
