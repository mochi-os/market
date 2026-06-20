// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { create } from 'zustand'
import { msg } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { getErrorMessage } from '@mochi/web'
import type { Account } from '@/types'
import { accountsApi } from '@/api/accounts'

interface AccountState {
  account: Account | null
  isLoading: boolean
  error: string | null
  isSeller: boolean
  isOnboarded: boolean
  refresh: () => Promise<void>
}

export const useAccountStore = create<AccountState>((set) => ({
  account: null,
  isLoading: false,
  error: null,
  isSeller: false,
  isOnboarded: false,
  refresh: async () => {
    set({ isLoading: true, error: null })
    try {
      const account = await accountsApi.get()
      set({
        account,
        isSeller: !!account.seller,
        isOnboarded: !!account.onboarded,
        isLoading: false,
      })
    } catch (err) {
      set({
        isLoading: false,
        error: getErrorMessage(err, i18n._(msg`Failed to load account`)),
      })
    }
  },
}))
