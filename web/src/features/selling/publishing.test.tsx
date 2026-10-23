// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublishSwitches, PublishingSection } from './publishing'

const state = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  forget: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/api/publish', () => ({
  publishApi: {
    get: () => state.get(),
    set: (accounts: string[]) => state.set(accounts),
    forget: (account: string) => state.forget(account),
  },
}))
vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  toast: { success: state.success, error: state.error },
}))

const accounts = [
  {
    id: 'm1',
    type: 'mastodon',
    identifier: '@seller@mastodon.social',
    name: 'Seller',
    hosted: false,
  },
  {
    id: 'f1',
    type: 'fediverse',
    identifier: '@seller@example.org',
    name: 'Seller',
    hosted: true,
  },
]

function wrap(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </QueryClientProvider>
  )
}

describe('Market publishing section', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.get.mockReset().mockResolvedValue({
      accounts,
      publish: ['f1'],
      copies: { f1: 1 },
    })
    state.set.mockReset()
    state.forget.mockReset()
    state.success.mockReset()
    state.error.mockReset()
  })

  it('lists the accounts with a switch each, on for those listings go to', async () => {
    wrap(<PublishingSection />)
    expect(await screen.findByText('@seller@example.org')).toBeTruthy()
    expect(screen.getByText('Fediverse · 1 copy')).toBeTruthy()
    expect(
      screen.getByRole('switch', { name: 'Publish to @seller@example.org' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(
      screen.getByRole('switch', { name: 'Publish to @seller@mastodon.social' })
    ).toHaveAttribute('aria-checked', 'false')
  })

  it('shows nothing where the seller has no account to publish to', async () => {
    state.get.mockResolvedValue({ accounts: [], publish: [], copies: {} })
    wrap(<PublishingSection />)
    await waitFor(() => expect(state.get).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('Publish to')).toBeNull()
  })

  it('offers to delete the copies left on an account taken off the list', async () => {
    state.set.mockResolvedValue({ publish: [], kept: { f1: 1 } })
    state.forget.mockResolvedValue({ deleted: 1 })
    wrap(<PublishingSection />)
    fireEvent.click(
      await screen.findByRole('switch', {
        name: 'Publish to @seller@example.org',
      })
    )
    await waitFor(() => expect(state.set).toHaveBeenCalledWith([]))
    expect(
      await screen.findByText(
        'Copies published there: 1. They stay unless you delete them.'
      )
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete copies' }))
    await waitFor(() => expect(state.forget).toHaveBeenCalledWith('f1'))
    expect(state.success).toHaveBeenCalledWith('Deleted 1 copies')
  })
})

describe('Market publish switches', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.get.mockReset().mockResolvedValue({
      accounts,
      publish: ['f1'],
      copies: {},
    })
  })

  it("start from the seller's list and report a change", async () => {
    const changed = vi.fn()
    wrap(<PublishSwitches chosen={null} onChange={changed} />)
    expect(
      await screen.findByRole('switch', { name: '@seller@example.org' })
    ).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(
      screen.getByRole('switch', { name: '@seller@mastodon.social' })
    )
    expect(changed).toHaveBeenCalledWith(['f1', 'm1'])
  })
})
