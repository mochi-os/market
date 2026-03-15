import type { Photo } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const photosApi = {
  upload: (listingId: number, file: File) => {
    const formData = new FormData()
    formData.append('listing', String(listingId))
    formData.append('file', file)
    return client.instance
      .post<{ data: Photo }>(endpoints.photos.upload, formData)
      .then((r) => r.data.data)
  },

  list: (listing: number) =>
    client
      .post<{ data: Photo[] }>(endpoints.photos.list, { listing })
      .then((r) => r.data),

  delete: (id: number) =>
    client.post<unknown>(endpoints.photos.delete, { id }),

  reorder: (listing: number, ids: number[]) =>
    client.post<unknown>(endpoints.photos.reorder, {
      listing,
      ids: JSON.stringify(ids),
    }),
}
