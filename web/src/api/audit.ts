import { client } from './client'
import { endpoints } from './endpoints'

export interface AuditEntry {
  id: number
  event: number
  app: string
  kind: string
  object: string
  role: string
  actor: string
  actor_name: string
  action: string
  data: string
  timestamp: number
}

export const auditApi = {
  object: (params: { kind: string; object: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { audit: AuditEntry[]; total: number } }>(
        endpoints.audit.object,
        params
      )
      .then((r) => r.data),
}
