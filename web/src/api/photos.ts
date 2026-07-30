// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { AxiosProgressEvent } from 'axios'
import type { Photo } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const photosApi = {
  upload: (
    listingId: string,
    file: File,
    onProgress?: (event: AxiosProgressEvent) => void,
  ) => {
    const formData = new FormData()
    formData.append('listing', String(listingId))
    formData.append('file', file)
    return client.instance
      .post<{ data: Photo }>(endpoints.photos.upload, formData, {
        timeout: 0,
        onUploadProgress: onProgress,
      })
      .then((r) => r.data.data)
  },

  list: (listing: string) =>
    client
      .post<{ data: Photo[] }>(endpoints.photos.list, { listing })
      .then((r) => r.data),

  // Authenticated photo list for the seller's editor: returns photos for a
  // draft / moderation-held listing the public route hides. The public
  // `list` can't, because an anonymous request to it runs as the host owner.
  ownedList: (listing: string) =>
    client
      .post<{ data: Photo[] }>(endpoints.photos.ownedList, { listing })
      .then((r) => r.data),

  // Fetch a photo's bytes through the authenticated owned route so a draft's
  // image loads in the editor. An <img> tag can't carry the app JWT from the
  // sandboxed iframe, so the editor renders the returned Blob via an object URL.
  ownedBlob: (id: string, variant: 'thumbnail' | 'preview' | '' = 'thumbnail') =>
    client.instance
      .get<Blob>(
        variant ? `-/photo/owned/${id}/${variant}` : `-/photo/owned/${id}`,
        { responseType: 'blob' },
      )
      .then((r) => r.data),

  delete: (id: string) =>
    client.post<unknown>(endpoints.photos.delete, { id }),

  reorder: (listing: string, ids: string[]) =>
    client.post<unknown>(endpoints.photos.reorder, {
      listing,
      ids: JSON.stringify(ids),
    }),
}
