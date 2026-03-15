import type { Asset } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const assetsApi = {
  upload: (listingId: number, file: File) => {
    const formData = new FormData()
    formData.append('listing', String(listingId))
    formData.append('file', file)
    return client.instance
      .post<{ data: Asset }>(endpoints.assets.upload, formData)
      .then((r) => r.data.data)
  },

  external: (params: {
    listing: number
    filename: string
    mime: string
    reference: string
  }) =>
    client
      .post<{ data: Asset }>(endpoints.assets.external, params)
      .then((r) => r.data),

  remove: (id: number) =>
    client.post<unknown>(endpoints.assets.remove, { id }),

  reorder: (listing: number, ids: number[]) =>
    client.post<unknown>(endpoints.assets.reorder, {
      listing,
      ids: JSON.stringify(ids),
    }),

  download: (id: number) =>
    client
      .post<{ data: { hosting: string; reference?: string } }>(
        endpoints.assets.download,
        { id }
      )
      .then((r) => r.data),
}
