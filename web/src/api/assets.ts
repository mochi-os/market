import type { Asset } from '@/types'
import { toast } from '@mochi/web'
import { client } from './client'
import { endpoints } from './endpoints'
import { t } from '@lingui/core/macro'

export const assetsApi = {
  upload: (listingId: string, file: File) => {
    const formData = new FormData()
    formData.append('listing', String(listingId))
    formData.append('file', file)
    return client.instance
      .post<{ data: Asset }>(endpoints.assets.upload, formData)
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
        const link = document.createElement('a')
        link.href = url
        link.target = '_blank'
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      return
    }

    const response = await client.instance.post(endpoints.assets.download, { id }, {
      responseType: 'blob',
    })
    const blob = response.data as Blob
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 1000)
    toast.success(t`Downloaded ${filename}`)
  },
}
