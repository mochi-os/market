import type { Review } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const reviewsApi = {
  create: (params: { order: number; rating: number; text?: string }) =>
    client
      .post<{ data: Review }>(endpoints.reviews.create, params)
      .then((r) => r.data),

  respond: (params: { id: number; response: string }) =>
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
}
