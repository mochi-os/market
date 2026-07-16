// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { AccountPage } from '@/features/account/account-page'
import { useAccountStore } from '@/stores/account-store'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/account')({
  loader: async () => {
    try {
      const account = await accountsApi.get()
      useAccountStore.getState().setAccount(account)
      return { account, error: null }
    } catch (error) {
      return {
        account: null,
        error: getErrorMessage(error, t`Failed to load account`),
      }
    }
  },
  component: AccountPage,
})
