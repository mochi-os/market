// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Order } from '@/types'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SaleDetailPage as SalePage } from './sale-detail-page'

const state = vi.hoisted(() => ({
  refund: vi.fn(),
  ship: vi.fn(),
  invalidate: vi.fn(),
  order: null as unknown as Order,
  // The loader's answer: one object until the route loads again, as the
  // router holds it.
  loaded: null as unknown as Record<string, unknown>,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLoaderData: () => state.loaded,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: state.invalidate }),
  useSearch: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/api/orders', () => ({
  ordersApi: { refund: state.refund, ship: state.ship },
}))
vi.mock('@/api/accounts', () => ({
  accountsApi: { fees: () => Promise.resolve({ platform: 5 }) },
}))
vi.mock('@/components/shared/audit-timeline', () => ({
  AuditTimeline: () => null,
}))
vi.mock('@/features/listing/message-sheet', () => ({
  MessageSheet: () => null,
}))

const settle = () => act(() => Promise.resolve())

beforeEach(() => {
  state.refund.mockReset().mockResolvedValue({ order: {}, dispute: null })
  state.ship.mockReset()
  state.invalidate.mockReset().mockResolvedValue(undefined)
  state.order = {
    id: 'o1',
    listing: 'l1',
    buyer: 'b1',
    seller: 's1',
    total: 2000,
    refunded: 0,
    payout: 1900,
    currency: 'gbp',
    delivery: 'shipping',
    status: 'paid',
    created: 1,
    buyer_name: 'Ada Lovelace',
    address_name: 'Ada Lovelace',
    address_line1: '1 Strasse',
    address_line2: '',
    address_city: 'Berlin',
    address_region: '',
    address_postcode: '10115',
    address_country: 'DE',
  } as Order
  state.loaded = {
    data: {
      order: state.order,
      listing: { id: 'l1', title: 'Teapot' },
      assets: [],
      dispute: null,
      review: null,
      peer_review: null,
      can_review: false,
    },
    error: null,
  }
})

function show() {
  return render(
    <I18nProvider i18n={i18n}>
      <SalePage />
    </I18nProvider>
  )
}

async function openRefund(amount?: string) {
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Issue refund' }))
  await settle()
  if (amount !== undefined) {
    fireEvent.change(screen.getByLabelText('Amount (GBP)'), {
      target: { value: amount },
    })
  }
  const buttons = screen.getAllByRole('button', { name: 'Issue refund' })
  return buttons[buttons.length - 1]
}

describe('Issue refund', () => {
  it('sends no amount for a full refund', async () => {
    fireEvent.click(await openRefund())
    await settle()
    expect(state.refund).toHaveBeenCalledWith({ id: 'o1' })
  })

  it('sends a partial amount in minor units', async () => {
    fireEvent.click(await openRefund('5'))
    await settle()
    expect(state.refund).toHaveBeenCalledWith({ id: 'o1', amount: 500 })
  })

  it('refuses a zero amount inline, and sends nothing', async () => {
    const confirm = await openRefund('0')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter an amount between £0.01 and £20.00'
    )
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    await settle()
    expect(state.refund).not.toHaveBeenCalled()
  })

  it('refuses more than the remainder inline', async () => {
    const confirm = await openRefund('25')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(confirm).toBeDisabled()
  })
})

describe('Ship order', () => {
  it('shows the order the answer carries, without reading it again', async () => {
    state.ship.mockResolvedValue({
      ...state.order,
      status: 'shipped',
      carrier: 'Royal Mail',
      buyer_name: 'Ada Lovelace',
    })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }))
    await settle()
    await settle()
    expect(screen.queryByRole('button', { name: 'Mark as shipped' })).toBeNull()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0)
    expect(state.invalidate).not.toHaveBeenCalled()
  })
})

describe('Shipping address', () => {
  it('names the country, not its code', () => {
    show()
    expect(screen.getByText('Germany')).toBeInTheDocument()
    expect(screen.queryByText('DE')).toBeNull()
  })
})
