// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { Photo } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const photosApi = {
  upload: (listingId: string, file: File) => {
    const formData = new FormData()
    formData.append('listing', String(listingId))
    formData.append('file', file)
    return client.instance
      .post<{ data: Photo }>(endpoints.photos.upload, formData, { timeout: 0 })
      .then((r) => r.data.data)
  },

  list: (listing: string) =>
    client
      .post<{ data: Photo[] }>(endpoints.photos.list, { listing })
      .then((r) => r.data),

  delete: (id: string) =>
    client.post<unknown>(endpoints.photos.delete, { id }),

  reorder: (listing: string, ids: string[]) =>
    client.post<unknown>(endpoints.photos.reorder, {
      listing,
      ids: JSON.stringify(ids),
    }),
}
