// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { Account, Fees } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const accountsApi = {
  get: (id?: string) =>
    client
      .post<{ data: Account }>(endpoints.accounts.get, id ? { id } : {})
      .then((r) => r.data),

  // Public profile of another account by id (works anonymously). Returns only
  // public fields; use get() for the caller's own (authenticated) account.
  profile: (id: string) =>
    client
      .post<{ data: Account }>(endpoints.accounts.profile, { id })
      .then((r) => r.data),

  update: (params: Record<string, unknown>) =>
    client
      .post<{ data: Account }>(endpoints.accounts.update, params)
      .then((r) => r.data),

  activate: () =>
    client
      .post<{ data: Account }>(endpoints.accounts.activate, {})
      .then((r) => r.data),

  fees: () =>
    client
      .post<{ data: Fees }>(endpoints.accounts.fees, {})
      .then((r) => r.data),

  stripeOnboarding: (returnUrl: string) =>
    client
      .post<{ data: { url: string; redirect?: string } }>(endpoints.accounts.stripeOnboarding, {
        return_url: returnUrl,
      })
      .then((r) => r.data),

  stripeStatus: () =>
    client
      .post<{
        data: { charges_enabled: boolean; payouts_enabled: boolean }
      }>(endpoints.accounts.stripeStatus, {})
      .then((r) => r.data),
}
