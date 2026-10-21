// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { client } from './client'
import { endpoints } from './endpoints'

/** One of the seller's accounts on another network listings may be published to. */
export interface PublishAccount {
  id: string
  /** `mastodon`, `bluesky` or `fediverse`. */
  type: string
  /** The account's address on its network. */
  identifier: string
  name: string
  hosted: boolean
}

export interface PublishResponse {
  accounts: PublishAccount[]
  publish: string[]
  copies: Record<string, number>
}

export const publishApi = {
  get: () =>
    client
      .post<{ data: PublishResponse }>(endpoints.publish.get, {})
      .then((r) => r.data),

  set: (accounts: string[]) =>
    client
      .post<{
        data: { publish: string[]; kept: Record<string, number> }
      }>(endpoints.publish.set, { accounts: JSON.stringify(accounts) })
      .then((r) => r.data),

  forget: (account: string) =>
    client
      .post<{ data: { deleted: number } }>(endpoints.publish.forget, {
        account,
      })
      .then((r) => r.data),
}
