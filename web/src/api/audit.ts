// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { everyPage } from '@/lib/paging'
import { client } from './client'
import { endpoints } from './endpoints'

interface AuditEntry {
  id: string
  event: string
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

function object(params: {
  kind: string
  object: string
  page?: number
  limit?: number
  after?: string
}) {
  return client
    .post<{ data: { audit: AuditEntry[]; total: number; next?: string } }>(
      endpoints.audit.object,
      params
    )
    .then((r) => r.data)
}

export const auditApi = {
  object,

  // An object's whole trail, page after page: the timeline shows all of it.
  all: (params: { kind: string; object: string; limit: number }) =>
    everyPage(
      (request) =>
        object({ kind: params.kind, object: params.object, ...request }).then(
          (r) => ({ items: r.audit, total: r.total, next: r.next })
        ),
      (entry) => entry.id,
      params.limit
    ).then((audit) => ({ audit })),
}
