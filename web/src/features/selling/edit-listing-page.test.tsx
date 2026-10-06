// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Asset, Listing } from '@/types'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { useAuthStore } from '@mochi/web'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditListingPage } from './edit-listing-page'

const listing: Listing = {
  id: 'l1',
  seller: 's1',
  title: 'Teapot',
  description: '',
  category: '',
  tags: '[]',
  condition: 'new',
  type: 'physical',
  pricing: 'fixed',
  price: 0,
  currency: 'gbp',
  interval: 'monthly',
  pickup: 0,
  shipping: 0,
  location: '',
  information: '',
  quantity: 1,
  score: 0,
  factors: '',
  moderation: '',
  moderator: '',
  moderated: 0,
  notes: '',
  status: 'draft',
  created: 0,
  updated: 0,
}

const digital: Listing = { ...listing, id: 'l2', type: 'digital' }

const manual: Asset = {
  id: 'a1',
  listing: 'l2',
  hosting: 'local',
  filename: 'manual.pdf',
  size: 1024,
  mime: 'application/pdf',
  position: 0,
}

const api = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  shipping: vi.fn(),
  removeAsset: vi.fn(),
}))

// What the route loader hands the page; a test swaps it before rendering.
const loaded = vi.hoisted(() => ({
  detail: null as { listing: Listing; assets: Asset[]; shipping: [] } | null,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLoaderData: () => ({
    detail: loaded.detail ?? { listing, assets: [], shipping: [] },
    photos: [],
    error: null,
  }),
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
  useSearch: () => ({}),
}))
// The place search it holds asks a query client for its results.
vi.mock('@mochi/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mochi/web')>()),
  PlacePicker: () => null,
}))
// A save sent with keepalive goes out for real, to the stubbed fetch.
vi.mock('@/api/listings', async (importOriginal) => {
  const { listingsApi } =
    await importOriginal<typeof import('@/api/listings')>()
  return {
    listingsApi: {
      update: (...args: Parameters<typeof listingsApi.update>) =>
        args[1] ? listingsApi.update(...args) : api.update(args[0]),
      delete: api.remove,
    },
    categoriesApi: { list: () => Promise.resolve([]) },
  }
})
vi.mock('@/api/shipping', async (importOriginal) => {
  const { shippingApi } =
    await importOriginal<typeof import('@/api/shipping')>()
  return {
    shippingApi: {
      set: (...args: Parameters<typeof shippingApi.set>) =>
        args[2] ? shippingApi.set(...args) : api.shipping(args[0], args[1]),
    },
  }
})
vi.mock('@/api/accounts', () => ({
  accountsApi: { fees: () => Promise.resolve(null) },
}))
vi.mock('@/api/photos', () => ({ photosApi: {} }))
vi.mock('@/api/assets', () => ({ assetsApi: { remove: api.removeAsset } }))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ account: null, isOnboarded: false }),
}))
vi.mock('./use-stripe-connect', () => ({
  useStripeConnect: () => ({ connecting: false, connect: vi.fn() }),
}))

function show() {
  return render(
    <I18nProvider i18n={i18n}>
      <EditListingPage />
    </I18nProvider>
  )
}

function retitle(title: string) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: title },
  })
}

// Lets queued promises run: the save queue, and a request answering.
const settle = () => act(() => Promise.resolve())

const saved = () =>
  api.update.mock.calls.map((call) => (call[0] as { title: string }).title)

const answered = (status: number) =>
  new Response(JSON.stringify({ data: {} }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const fetched = vi.fn<typeof fetch>()

beforeEach(() => {
  api.update.mockReset().mockResolvedValue({})
  api.remove.mockReset().mockResolvedValue({})
  api.shipping.mockReset().mockResolvedValue({})
  api.removeAsset.mockReset().mockResolvedValue({})
  loaded.detail = null
  fetched.mockReset().mockImplementation(async () => answered(200))
  vi.stubGlobal('fetch', fetched)
  useAuthStore.setState({ token: 'secret' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  useAuthStore.setState({ token: '' })
})

function sent() {
  return fetched.mock.calls.map(([url, init]) => ({
    url,
    keepalive: init?.keepalive,
    method: init?.method,
    authorization: (init?.headers as Record<string, string>).Authorization,
    body: JSON.parse(init?.body as string) as Record<string, unknown>,
  }))
}

function hide() {
  const visibility = vi
    .spyOn(document, 'visibilityState', 'get')
    .mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  visibility.mockRestore()
}

describe('Listing editor autosave', () => {
  it('saves an edit left within the debounce', async () => {
    const view = show()
    retitle('Teapot, blue')
    expect(api.update).not.toHaveBeenCalled()
    view.unmount()
    await settle()
    expect(saved()).toEqual(['Teapot, blue'])
  })

  it('saves nothing on leaving when nothing was edited', async () => {
    const view = show()
    view.unmount()
    await settle()
    expect(api.update).not.toHaveBeenCalled()
  })

  it('does not save again on leaving after the debounce has saved', async () => {
    vi.useFakeTimers()
    const view = show()
    retitle('Teapot, blue')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(saved()).toEqual(['Teapot, blue'])
    view.unmount()
    await settle()
    expect(saved()).toEqual(['Teapot, blue'])
  })

  it('queues the flush behind a save in flight', async () => {
    vi.useFakeTimers()
    let answer = () => {}
    api.update.mockImplementationOnce(
      () => new Promise<void>((resolve) => (answer = resolve))
    )
    const view = show()
    retitle('Teapot, blue')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    retitle('Teapot, green')
    view.unmount()
    await settle()
    // The flush waits for the save it would race.
    expect(saved()).toEqual(['Teapot, blue'])
    answer()
    await settle()
    await settle()
    expect(saved()).toEqual(['Teapot, blue', 'Teapot, green'])
  })

  it('saves nothing on leaving a draft it deleted', async () => {
    const view = show()
    retitle('Teapot, blue')
    // The header draws its actions once per breakpoint.
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete draft' })[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await settle()
    expect(api.remove).toHaveBeenCalledTimes(1)
    view.unmount()
    await settle()
    expect(api.update).not.toHaveBeenCalled()
  })
})

// The shell's back, forward and cross-app links, and closing the tab, take the
// page without unmounting it.
describe('Listing editor leaving without unmounting', () => {
  it('sends an unsaved edit with keepalive as the page goes', async () => {
    show()
    retitle('Teapot, blue')
    window.dispatchEvent(new Event('pagehide'))
    await settle()
    expect(sent()).toEqual([
      {
        url: '/market/-/listings/update',
        keepalive: true,
        method: 'POST',
        authorization: 'Bearer secret',
        body: expect.objectContaining({ id: 'l1', title: 'Teapot, blue' }),
      },
    ])
    expect(api.update).not.toHaveBeenCalled()
  })

  it('sends what the autosave sends', async () => {
    const view = show()
    retitle('Teapot, blue')
    window.dispatchEvent(new Event('pagehide'))
    await settle()
    retitle('Teapot, green')
    retitle('Teapot, blue')
    view.unmount()
    await settle()
    expect(sent()[0].body).toEqual(api.update.mock.calls[0][0])
  })

  it('sends it once, with nothing more when the page unmounts', async () => {
    const view = show()
    retitle('Teapot, blue')
    window.dispatchEvent(new Event('pagehide'))
    window.dispatchEvent(new Event('pagehide'))
    await settle()
    view.unmount()
    await settle()
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(api.update).not.toHaveBeenCalled()
  })

  it('sends nothing when nothing was edited', async () => {
    show()
    window.dispatchEvent(new Event('pagehide'))
    await settle()
    expect(fetched).not.toHaveBeenCalled()
  })

  it('sends nothing after the autosave has saved', async () => {
    vi.useFakeTimers()
    show()
    retitle('Teapot, blue')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(saved()).toEqual(['Teapot, blue'])
    window.dispatchEvent(new Event('pagehide'))
    await settle()
    expect(fetched).not.toHaveBeenCalled()
  })

  it('sends an unsaved edit with keepalive when the page is hidden', async () => {
    show()
    retitle('Teapot, blue')
    hide()
    await settle()
    await settle()
    expect(sent()).toMatchObject([
      { keepalive: true, body: { title: 'Teapot, blue' } },
    ])
  })

  it('keeps the edit unsaved when the send fails, for the next save', async () => {
    fetched.mockImplementation(async () => answered(500))
    const view = show()
    retitle('Teapot, blue')
    hide()
    await settle()
    await settle()
    await settle()
    expect(fetched).toHaveBeenCalledTimes(1)
    view.unmount()
    await settle()
    expect(saved()).toEqual(['Teapot, blue'])
  })
})

describe('Listing editor asset delete', () => {
  beforeEach(() => {
    loaded.detail = { listing: digital, assets: [manual], shipping: [] }
  })

  it('asks before deleting the file a buyer pays for', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Delete asset' }))
    expect(api.removeAsset).not.toHaveBeenCalled()
    expect(await screen.findByText('Delete asset?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await settle()
    expect(api.removeAsset).toHaveBeenCalledWith('a1')
    expect(screen.queryByText('manual.pdf')).toBeNull()
  })

  it('keeps the file when the confirm is cancelled', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Delete asset' }))
    await screen.findByText('Delete asset?')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await settle()
    expect(api.removeAsset).not.toHaveBeenCalled()
    expect(screen.getByText('manual.pdf')).toBeInTheDocument()
  })

  // jsdom evaluates neither hover nor `(hover: none)`, so the classes are the
  // only thing that says the button shows on a touch screen and on focus.
  it('shows the delete button on touch and on keyboard focus', () => {
    show()
    const { className } = screen.getByRole('button', { name: 'Delete asset' })
    expect(className).toContain('[@media(hover:none)]:opacity-100')
    expect(className).toContain('focus-visible:opacity-100')
  })
})
