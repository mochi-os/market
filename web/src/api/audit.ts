// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { client } from './client'
import { endpoints } from './endpoints'

export interface AuditEntry {
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

export const auditApi = {
  object: (params: { kind: string; object: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { audit: AuditEntry[]; total: number } }>(
        endpoints.audit.object,
        params
      )
      .then((r) => r.data),
}
