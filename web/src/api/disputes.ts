import { client } from './client'
import { endpoints } from './endpoints'

export interface Dispute {
  id: number
  order: number
  opener: string
  reason: string
  description: string
  status: string
  response: string
  resolution: string
  resolver: string
  created: number
  resolved: number
}

export const disputesApi = {
  get: (id: number) =>
    client
      .post<{ data: Dispute }>(endpoints.disputes.get, { id })
      .then((r) => r.data),

  respond: (params: { id: number; body: string }) =>
    client
      .post<{ data: Dispute }>(endpoints.disputes.respond, params)
      .then((r) => r.data),
}
