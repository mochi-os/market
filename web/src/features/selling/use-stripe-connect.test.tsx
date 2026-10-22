// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { StrictMode, type ReactNode } from 'react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStripeConnect } from './use-stripe-connect'

const mocks = vi.hoisted(() => ({
  search: {} as Record<string, string>,
  complete: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useSearch: () => mocks.search,
}))
vi.mock('@mochi/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mochi/web')>()),
  toast: { success: mocks.success, info: mocks.info, error: mocks.error },
}))
vi.mock('@/api/accounts', () => ({
  accountsApi: { stripeComplete: mocks.complete, stripeOnboarding: vi.fn() },
}))
// The store hands out the refresh function the test last set, so a re-render
// can give the effect a new dependency, as a late language change does to t.
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ refresh: mocks.refresh }),
}))

function wrapper({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </StrictMode>
  )
}

beforeEach(() => {
  i18n.loadAndActivate({ locale: 'en', messages: {} })
  window.history.replaceState(
    null,
    '',
    '/market/listings/l1/edit?stripe_code=ac_1&stripe_state=st_1'
  )
})

afterEach(() => {
  vi.clearAllMocks()
  mocks.search = {}
  mocks.refresh = vi.fn()
})

// Stripe returns every seller to mochi-os.org, which hands the ceremony back
// to the page it started on, on whichever Mochi server that is. That page
// finishes it, signed in.
describe('a handed-back Stripe connection', () => {
  it('is completed once, though the effect runs again', async () => {
    mocks.search = { stripe_code: 'ac_1', stripe_state: 'st_1' }
    mocks.complete.mockResolvedValue({ connected: '1' })
    const { rerender } = renderHook(() => useStripeConnect(), { wrapper })
    await waitFor(() => expect(mocks.success).toHaveBeenCalled())
    // A dependency changing identity re-runs the effect with the code still
    // in the search: the code is single-use, so a second completion would be
    // refused and reported as a failure over the success.
    const first = mocks.refresh
    mocks.refresh = vi.fn()
    rerender()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mocks.complete).toHaveBeenCalledTimes(1)
    expect(mocks.complete).toHaveBeenCalledWith('ac_1', 'st_1')
    expect(first).toHaveBeenCalledWith({ force: true })
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('takes the code out of the address before completing', async () => {
    mocks.search = { stripe_code: 'ac_1', stripe_state: 'st_1' }
    mocks.complete.mockResolvedValue({ connected: '1' })
    renderHook(() => useStripeConnect(), { wrapper })
    await waitFor(() => expect(mocks.complete).toHaveBeenCalled())
    expect(window.location.search).toBe('')
  })

  it('reports a connection Stripe still needs information for', async () => {
    mocks.search = { stripe_code: 'ac_1', stripe_state: 'st_1' }
    mocks.complete.mockResolvedValue({ connected: 'pending' })
    renderHook(() => useStripeConnect(), { wrapper })
    await waitFor(() => expect(mocks.info).toHaveBeenCalled())
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it('reports a refused completion as a failure', async () => {
    mocks.search = { stripe_code: 'ac_1', stripe_state: 'st_1' }
    mocks.complete.mockResolvedValue({
      error: 'Sign in as the account that started the connection, then try again',
    })
    renderHook(() => useStripeConnect(), { wrapper })
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it('does nothing without both the code and the state', () => {
    mocks.search = { stripe_code: 'ac_1' }
    renderHook(() => useStripeConnect(), { wrapper })
    expect(mocks.complete).not.toHaveBeenCalled()
  })
})
