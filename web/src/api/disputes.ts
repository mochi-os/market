// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { client } from './client'
import { endpoints } from './endpoints'

export interface Dispute {
  id: string
  order: string
  opener: string
  reason: string
  description: string
  status: string
  response: string
  resolution: string
  resolver: string
  fee: number
  fee_refunded: number
  evidence_due: number
  refund_amount: number
  created: number
  resolved: number
}

export const disputesApi = {
  get: (id: string) =>
    client
      .post<{ data: Dispute }>(endpoints.disputes.get, { id })
      .then((r) => r.data),

  respond: (params: { id: string; body: string }) =>
    client
      .post<{ data: Dispute }>(endpoints.disputes.respond, params)
      .then((r) => r.data),
}
