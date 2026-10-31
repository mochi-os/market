// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/listings', () => ({ listingsApi: { get: vi.fn() } }))
vi.mock('@/api/photos', () => ({ photosApi: { list: vi.fn() } }))
vi.mock('@/api/reviews', () => ({ reviewsApi: { account: vi.fn() } }))

const { loadListing } = await import('./load-listing')
const { listingsApi } = await import('@/api/listings')
const { photosApi } = await import('@/api/photos')
const { reviewsApi } = await import('@/api/reviews')

const get = vi.mocked(listingsApi.get)
const list = vi.mocked(photosApi.list)
const account = vi.mocked(reviewsApi.account)

const detail = {
  listing: { id: 'l1' },
  seller: { id: 's1' },
} as unknown as Awaited<ReturnType<typeof listingsApi.get>>

describe('loadListing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks for the photos beside the listing, not after it', async () => {
    // Each leg goes to the comptroller; the listing here never answers, and
    // the photos are still asked for.
    get.mockReturnValue(new Promise(() => {}))
    list.mockResolvedValue([])
    void loadListing('l1')
    await Promise.resolve()
    expect(list).toHaveBeenCalledWith('l1')
  })

  it('hands the page the photos it asked for', async () => {
    get.mockResolvedValue(detail)
    const photos = [{ id: 'p1' }] as never
    list.mockResolvedValue(photos)
    const data = await loadListing('l1')
    expect(data.data).toBe(detail)
    expect(data.photos?.listing).toBe('l1')
    expect(await data.photos?.list).toBe(photos)
  })

  it('does not hold the listing back for the seller reviews', async () => {
    get.mockResolvedValue(detail)
    list.mockResolvedValue([])
    account.mockReturnValue(new Promise(() => {}))
    const data = await loadListing('l1')
    expect(data.data).toBe(detail)
    expect(account).not.toHaveBeenCalled()
  })

  it('answers no photos rather than failing when they cannot be read', async () => {
    get.mockResolvedValue(detail)
    list.mockRejectedValue(new Error('offline'))
    const data = await loadListing('l1')
    expect(await data.photos?.list).toBeNull()
  })

  it('reports a listing that cannot be loaded', async () => {
    get.mockRejectedValue(new Error('gone'))
    list.mockResolvedValue([])
    const data = await loadListing('l1')
    expect(data.data).toBeNull()
    expect(data.error).toBeTruthy()
  })
})
