// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Account, Listing, ShippingOption } from '@/types'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CheckoutPage } from './checkout-page'

const fixture = vi.hoisted(() => {
  const zone = (id: string, region: string, price: number) => ({
    id,
    listing: 'l1',
    region,
    price,
    currency: 'gbp',
    days: '',
    notes: '',
  })
  return {
    listing: {
      id: 'l1',
      seller: 's1',
      title: 'Teapot',
      type: 'physical',
      pricing: 'fixed',
      price: 1000,
      currency: 'gbp',
      shipping: 1,
      pickup: 1,
      status: 'active',
    } as Listing,
    shipping: [
      zone('o1', 'europe', 500),
      zone('o2', 'world', 900),
      zone('o3', 'US', 300),
      zone('o4', 'Mainland only', 800),
    ] as ShippingOption[],
    account: {
      id: 'b1',
      address_name: 'Ada Lovelace',
      address_line1: '12 St James Square',
      address_line2: '',
      address_city: 'London',
      address_region: '',
      address_postcode: 'SW1Y 4JH',
      address_country: 'GB',
    } as Account,
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLoaderData: () => ({
    data: {
      listing: fixture.listing,
      shipping: fixture.shipping,
      assets: [],
      auction: null,
      my_subscription: null,
    },
    error: null,
  }),
  useNavigate: () => vi.fn(),
}))
vi.mock('@/stores/account-store', () => {
  const state = { account: fixture.account, refresh: () => Promise.resolve() }
  return {
    useAccountStore: (select: (s: typeof state) => unknown) => select(state),
  }
})
vi.mock('@/api/shipping', () => ({
  shippingApi: {
    regions: () =>
      Promise.resolve({
        countries: ['DE', 'GB', 'US'],
        groups: { world: [], europe: ['DE', 'GB'] },
      }),
  },
}))

function show() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <CheckoutPage />
      </I18nProvider>
    </QueryClientProvider>
  )
}

// Opens a select by its trigger and picks the option by its name.
function choose(trigger: HTMLElement, name: string | RegExp) {
  fireEvent.keyDown(trigger, { key: 'Enter' })
  fireEvent.click(screen.getByRole('option', { name }))
}

function summary() {
  const heading = screen.getByText('Order summary')
  const card = heading.closest('.rounded-lg')
  if (!(card instanceof HTMLElement)) throw new Error('no summary')
  return within(card)
}

async function shipped() {
  show()
  choose(screen.getByRole('combobox', { name: 'Delivery method' }), 'Shipping')
  // The groups' countries arrive, and the cheapest option is chosen.
  await screen.findByText(/Europe/)
}

describe('Checkout', () => {
  it("starts from the address saved on the buyer's account", async () => {
    await shipped()
    expect(screen.getByLabelText('Full name')).toHaveValue('Ada Lovelace')
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent(
      'United Kingdom'
    )
  })

  it("offers only the options that ship to the buyer's country", async () => {
    await shipped()
    fireEvent.keyDown(
      screen.getByRole('combobox', { name: 'Shipping option' }),
      { key: 'Enter' }
    )
    const offered = screen
      .getAllByRole('option')
      .map((option) => option.textContent ?? '')
    expect(offered).toHaveLength(3)
    expect(offered[0]).toMatch(/^Europe/)
    expect(offered[1]).toMatch(/^Mainland only/)
    expect(offered[2]).toMatch(/^Worldwide/)
  })

  it('chooses the cheapest option that ships there', async () => {
    await shipped()
    expect(summary().getByText('Shipping')).toBeInTheDocument()
    expect(summary().getByText('£5.00')).toBeInTheDocument()
    expect(summary().getByText('£15.00')).toBeInTheDocument()
  })

  it('leaves postage out of the total once the buyer picks pickup', async () => {
    await shipped()
    choose(screen.getByRole('combobox', { name: 'Delivery method' }), 'Pickup')
    expect(summary().queryByText('Shipping')).toBeNull()
    expect(summary().queryByText('£15.00')).toBeNull()
    expect(summary().getAllByText('£10.00')).toHaveLength(2)
  })
})
