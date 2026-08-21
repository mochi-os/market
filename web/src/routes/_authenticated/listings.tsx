// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { useAccountStore } from '@/stores/account-store'
import { MyListingsPage } from '@/features/selling/my-listings-page'
import { requireSeller } from '@/lib/require-seller'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/listings')({
  beforeLoad: () => requireSeller(),
  loader: async () => {
    // Refresh the account store before render so isOnboarded is right on first
    // paint; otherwise the connect-Stripe form flashes for onboarded sellers.
    const accountPromise = useAccountStore.getState().refresh()
    try {
      const [data] = await Promise.all([listingsApi.mine({}), accountPromise])
      return { data, error: null }
    } catch (error) {
      await accountPromise.catch(() => {})
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load listings`),
      }
    }
  },
  component: MyListingsPage,
})
