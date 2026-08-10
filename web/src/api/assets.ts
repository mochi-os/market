// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { AxiosProgressEvent } from 'axios'
import type { Asset } from '@/types'
import { toast, shellSaveBlob, shellNavigateExternal } from '@mochi/web'
import { client } from './client'
import { endpoints } from './endpoints'
import { t } from '@lingui/core/macro'

export const assetsApi = {
  upload: (
    listingId: string,
    file: File,
    onProgress?: (event: AxiosProgressEvent) => void,
  ) => {
    const formData = new FormData()
    formData.append('listing', String(listingId))
    formData.append('file', file)
    return client.instance
      .post<{ data: Asset }>(endpoints.assets.upload, formData, {
        timeout: 0,
        onUploadProgress: onProgress,
      })
      .then((r) => r.data.data)
  },

  external: (params: {
    listing: string
    filename: string
    mime: string
    reference: string
  }) =>
    client
      .post<{ data: Asset[] }>(endpoints.assets.external, params)
      .then((r) => r.data),

  remove: (id: string) =>
    client.post<unknown>(endpoints.assets.remove, { id }),

  reorder: (listing: string, ids: string[]) =>
    client.post<unknown>(endpoints.assets.reorder, {
      listing,
      ids: JSON.stringify(ids),
    }),

  download: async (id: string, filename: string, hosting?: string) => {
    if (hosting === 'external') {
      const response = await client.post<{ data: { asset?: { reference?: string } } }>(
        endpoints.assets.download, { id },
      )
      const url = response.data?.asset?.reference
      if (url) {
        // shellNavigateExternal, not an anchor click. The blob branch below
        // already documents that a bare anchor-click silently no-ops inside
        // the shell's sandboxed iframe - this branch was doing exactly that
        // ten lines above the comment saying so, and an externally-hosted
        // asset simply never opened. Outside the shell the helper falls back
        // to a normal navigation.
        shellNavigateExternal(url)
      }
      return
    }

    const response = await client.instance.post(endpoints.assets.download, { id }, {
      responseType: 'blob',
    })
    const blob = response.data as Blob
    // A bare anchor-click save silently no-ops in the shell's sandboxed
    // iframe; shellSaveBlob hands the blob to the parent shell to save.
    if (await shellSaveBlob(blob, filename)) {
      toast.success(t`Downloaded ${filename}`)
    } else {
      toast.error(t`Failed to download`)
    }
  },
}
