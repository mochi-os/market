// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SellerSettingsPage, type SellerTab } from './seller-settings-page'

// Publish to is a tab of its own for a seller with somewhere to publish; with
// nowhere, the page has no tabs.

const state = vi.hoisted(() => ({
  seller: true,
  get: vi.fn(),
}))

vi.mock('@/api/publish', () => ({
  publishApi: { get: () => state.get() },
}))
vi.mock('@/api/accounts', () => ({
  accountsApi: { fees: () => new Promise(() => {}) },
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    account: { status: 'active' },
    isOnboarded: true,
  }),
}))
vi.mock('@/features/selling/use-seller-setup', () => ({
  useSellerSetup: () => ({
    isSeller: state.seller,
    stripeLinked: true,
    stripeDashboard: '',
    checkingStatus: false,
    connectingStripe: false,
    activating: false,
    handleActivate: vi.fn(),
    handleCheckStatus: vi.fn(),
    handleConnectStripe: vi.fn(),
  }),
}))

const account = {
  id: 'm1',
  type: 'mastodon',
  identifier: '@seller@mastodon.social',
  name: 'Seller',
  hosted: false,
}

function show(tab?: SellerTab) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <SellerSettingsPage tab={tab} onTab={vi.fn()} />
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('seller settings tabs', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.seller = true
    state.get.mockReset()
  })

  it('offers Publish to after Settings where the seller has somewhere to publish, and holds the section', async () => {
    state.get.mockResolvedValue({
      accounts: [account],
      publish: [],
      copies: {},
    })
    show()
    expect(await screen.findByRole('tab', { name: 'Publish to' })).toBeTruthy()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Settings',
      'Publish to',
    ])
    expect(screen.getByText('Account status')).toBeTruthy()
    expect(screen.queryByText('@seller@mastodon.social')).toBeNull()
  })

  it('shows the section on its tab, without the settings', async () => {
    state.get.mockResolvedValue({
      accounts: [account],
      publish: [],
      copies: {},
    })
    show('publish')
    expect(await screen.findByText('@seller@mastodon.social')).toBeTruthy()
    expect(screen.queryByText('Account status')).toBeNull()
  })

  it('has no tabs where there is nowhere to publish, and a link to Publish to opens the settings', async () => {
    state.get.mockResolvedValue({ accounts: [], publish: [], copies: {} })
    show('publish')
    await waitFor(() => expect(state.get).toHaveBeenCalled())
    expect(await screen.findByText('Account status')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('tablist')).toBeNull())
  })

  it('holds a link to Publish to while that is asked', async () => {
    state.get.mockReturnValue(new Promise(() => {}))
    show('publish')
    await waitFor(() => expect(state.get).toHaveBeenCalled())
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe(
      'Publish to'
    )
  })

  it('has no tabs for someone not yet a seller, who is never asked', () => {
    state.seller = false
    show()
    expect(screen.getByText('Account status')).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(state.get).not.toHaveBeenCalled()
  })
})
