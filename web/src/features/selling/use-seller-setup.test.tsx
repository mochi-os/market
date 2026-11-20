// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import type { Account } from '@/types'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountStore } from '@/stores/account-store'
import { useSellerSetup } from './use-seller-setup'

const api = vi.hoisted(() => ({ activate: vi.fn(), get: vi.fn() }))
vi.mock('@/api/accounts', () => ({
  accountsApi: { activate: api.activate, get: api.get },
}))
vi.mock('./use-stripe-connect', () => ({
  useStripeConnect: () => ({ connecting: false, connect: vi.fn() }),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
)

beforeEach(() => {
  api.activate.mockReset()
  api.get.mockReset()
  useAccountStore.setState({ account: null, isSeller: false })
})

describe('useSellerSetup', () => {
  it('takes the account activation answers, without reading it again', async () => {
    const answered = {
      id: 'a1',
      name: 'Ada Lovelace',
      seller: 1,
      onboarded: 0,
      stripe_testmode: true,
    } as Account
    api.activate.mockResolvedValue(answered)
    const { result } = renderHook(() => useSellerSetup(), { wrapper })
    await act(() => result.current.handleActivate())
    expect(api.get).not.toHaveBeenCalled()
    expect(useAccountStore.getState().account).toBe(answered)
    expect(result.current.isSeller).toBe(true)
    expect(result.current.stripeDashboard).toBe(
      'https://dashboard.stripe.com/test/'
    )
  })
})
