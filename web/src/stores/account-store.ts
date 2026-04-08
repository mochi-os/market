import { create } from 'zustand'
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
      set({ isLoading: false, error: getErrorMessage(err, 'Failed to load account') })
    }
  },
}))
