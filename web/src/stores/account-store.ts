// Copyright © 2026 Mochisoft OÜ
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
  setAccount: (account: Account) => void
  refresh: (options?: { force?: boolean }) => Promise<void>
}

let refreshInflight: Promise<void> | null = null

function applyAccount(account: Account) {
  return {
    account,
    isSeller: !!account.seller,
    isOnboarded: !!account.onboarded,
    isLoading: false,
    error: null,
  }
}

export const useAccountStore = create<AccountState>((set, get) => ({
  account: null,
  isLoading: false,
  error: null,
  isSeller: false,
  isOnboarded: false,

  setAccount: (account) => {
    set(applyAccount(account))
  },

  refresh: async (options) => {
    const { force = false } = options ?? {}
    const state = get()

    if (!force && state.account) {
      return
    }

    if (refreshInflight) {
      if (!force) {
        return refreshInflight
      }
      try {
        await refreshInflight
      } catch (e) {
        // ignore
      }
    }

    let currentPromise: Promise<void> | null = null

    currentPromise = (async () => {
      set({ isLoading: true, error: null })
      try {
        const account = await accountsApi.get()
        set(applyAccount(account))
      } catch (err) {
        set({
          isLoading: false,
          error: getErrorMessage(err, i18n._(msg`Failed to load account`)),
        })
      } finally {
        if (refreshInflight === currentPromise) {
          refreshInflight = null
        }
      }
    })()

    refreshInflight = currentPromise
    return currentPromise
  },
}))
