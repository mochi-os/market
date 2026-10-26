// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Bid } from '@/types'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyBidsPage } from './my-bids-page'

const loaded = vi.hoisted(() => ({ bids: [] as Bid[] }))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLoaderData: () => ({
    data: { bids: loaded.bids, total: loaded.bids.length },
    error: null,
  }),
}))
vi.mock('@/routes/_authenticated/bids', () => ({
  Route: { useSearch: () => ({}), useNavigate: () => vi.fn() },
}))
vi.mock('@/api/auctions', () => ({
  bidsApi: {
    mine: () =>
      Promise.resolve({ bids: loaded.bids, total: loaded.bids.length }),
  },
}))

function bid(fields: Partial<Bid>): Bid {
  return {
    id: 'b1',
    auction: 'a1',
    listing: 'l1',
    amount: 200,
    status: 'lost',
    created: 100,
    currency: 'eur',
    ...fields,
  }
}

// Lets the list's first load settle.
const settle = () => act(() => Promise.resolve())

function row(title: string) {
  const found = screen.getByText(title).closest('.rounded-lg')
  if (!(found instanceof HTMLElement)) throw new Error(`no row for ${title}`)
  return within(found)
}

beforeEach(() => {
  loaded.bids = []
})

describe('Bids', () => {
  it('labels a bid on a cancelled auction Cancelled, not Lost', async () => {
    loaded.bids = [
      bid({ title: 'Cancelled auction', auction_status: 'cancelled' }),
    ]
    render(
      <I18nProvider i18n={i18n}>
        <MyBidsPage />
      </I18nProvider>
    )
    await settle()
    const cancelled = row('Cancelled auction')
    expect(cancelled.getByText('Cancelled')).toBeInTheDocument()
    expect(cancelled.queryByText('Lost')).toBeNull()
  })

  it('labels an earlier bid on a cancelled auction Cancelled too', async () => {
    loaded.bids = [
      bid({
        title: 'Cancelled auction',
        status: 'outbid',
        auction_status: 'cancelled',
      }),
    ]
    render(
      <I18nProvider i18n={i18n}>
        <MyBidsPage />
      </I18nProvider>
    )
    await settle()
    const cancelled = row('Cancelled auction')
    expect(cancelled.getByText('Cancelled')).toBeInTheDocument()
    expect(cancelled.queryByText('Outbid')).toBeNull()
  })

  it('keeps Lost for an auction that ran to the end', async () => {
    loaded.bids = [
      bid({
        id: 'b2',
        title: 'Finished auction',
        auction_status: 'ended_sold',
      }),
    ]
    render(
      <I18nProvider i18n={i18n}>
        <MyBidsPage />
      </I18nProvider>
    )
    await settle()
    const finished = row('Finished auction')
    expect(finished.getByText('Lost')).toBeInTheDocument()
    expect(finished.queryByText('Cancelled')).toBeNull()
  })
})
