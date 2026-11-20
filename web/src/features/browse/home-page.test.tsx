// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Listing } from '@/types'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './home-page'

const state = vi.hoisted(() => ({
  search: vi.fn(),
  error: vi.fn(),
  loaded: null as unknown as Record<string, unknown>,
  // The list's end is in view: every observer is told so as it starts.
  observers: [] as Array<() => void>,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLoaderData: () => state.loaded,
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/api/listings', () => ({
  listingsApi: { search: state.search },
}))
vi.mock('@/lib/recently-viewed', () => ({
  getRecentlyViewed: () => Promise.resolve([]),
  clearRecentlyViewed: vi.fn(),
  setRecentlyViewedList: vi.fn(),
}))
vi.mock('@/components/shared/listing-card', () => ({
  ListingCardFromSearch: ({ listing }: { listing: Listing }) => (
    <p>{listing.title}</p>
  ),
}))
vi.mock('@mochi/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mochi/web')>()),
  toast: { error: state.error },
}))

function listing(id: string): Listing {
  return { id, title: `Listing ${id}`, status: 'active' } as Listing
}

class Observer {
  private connected = true
  constructor(private callback: IntersectionObserverCallback) {}
  observe() {
    const fire = () => {
      if (!this.connected) return
      this.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      )
    }
    state.observers.push(fire)
    fire()
  }
  disconnect() {
    this.connected = false
  }
  unobserve() {}
}

const settle = () => act(() => Promise.resolve())

beforeEach(() => {
  state.search.mockReset()
  state.error.mockReset()
  state.observers = []
  vi.stubGlobal('IntersectionObserver', Observer)
  state.loaded = {
    results: {
      listings: [listing('a')],
      total: 3,
      limit: 24,
      offset: 0,
      next: 'c1',
    },
    categories: [],
    error: null,
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function show() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <HomePage />
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('Home listings', () => {
  it('asks for the listings after the last one it holds', async () => {
    state.search.mockResolvedValue({
      listings: [listing('b'), listing('c')],
      total: 3,
      next: '',
    })
    show()
    await settle()
    expect(state.search).toHaveBeenCalledTimes(1)
    expect(state.search).toHaveBeenCalledWith({
      sort: 'recent',
      page: 2,
      limit: 24,
      after: 'c1',
    })
    expect(screen.getByText('Listing c')).toBeInTheDocument()
  })

  it('stops asking after a page fails, until the reader retries', async () => {
    state.search.mockRejectedValue(new Error('Comptroller unreachable'))
    show()
    await settle()
    await settle()
    for (const fire of state.observers) act(() => fire())
    await settle()
    expect(state.search).toHaveBeenCalledTimes(1)
    expect(state.error).toHaveBeenCalledTimes(1)
    state.search.mockResolvedValue({
      listings: [listing('b')],
      total: 3,
      next: '',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await settle()
    expect(state.search).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Listing b')).toBeInTheDocument()
  })
})
