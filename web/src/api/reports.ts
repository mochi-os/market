import { client } from './client'
import { endpoints } from './endpoints'

export const reportsApi = {
  create: (params: {
    target: string
    type: string
    reason: string
    details?: string
  }) =>
    client.post<unknown>(endpoints.reports.create, params),
}
