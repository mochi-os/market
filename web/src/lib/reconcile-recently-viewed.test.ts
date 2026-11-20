// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Listing } from '@/types'
import { describe, expect, it, vi } from 'vitest'
import type { listingsApi } from '@/api/listings'
import type { photosApi } from '@/api/photos'
import { reconcileRecentlyViewedList } from './reconcile-recently-viewed'

function listing(id: string, fields: Partial<Listing> = {}): Listing {
  return { id, title: id, status: 'active', ...fields } as Listing
}

function deps(batch: (ids: string[]) => Promise<Listing[]>) {
  const get = vi.fn()
  const viewerBatch = vi.fn(batch)
  return {
    get,
    viewerBatch,
    deps: {
      listingsApi: { get, viewerBatch } as unknown as typeof listingsApi,
      photosApi: { list: vi.fn() } as unknown as typeof photosApi,
    },
  }
}

describe('reconcileRecentlyViewedList signed in', () => {
  it('asks for every listing in one request, and none on its own', async () => {
    const api = deps(async () => [listing('a'), listing('c')])
    await reconcileRecentlyViewedList(
      [listing('a'), listing('b'), listing('c')],
      [],
      api.deps,
      true
    )
    expect(api.viewerBatch).toHaveBeenCalledTimes(1)
    expect(api.viewerBatch).toHaveBeenCalledWith(['a', 'b', 'c'])
    expect(api.get).not.toHaveBeenCalled()
  })

  it('drops the listings the answer leaves out, and those no longer on sale', async () => {
    const api = deps(async () => [
      listing('a', { title: 'A, renamed' }),
      listing('c', { status: 'sold' }),
    ])
    const kept = await reconcileRecentlyViewedList(
      [listing('a'), listing('b'), listing('c')],
      [],
      api.deps,
      true
    )
    expect(kept).toEqual([listing('a', { title: 'A, renamed' })])
  })

  it('takes a listing in the grid from the grid, without asking', async () => {
    const api = deps(async () => [])
    const kept = await reconcileRecentlyViewedList(
      [listing('a')],
      [listing('a', { title: 'In the grid' })],
      api.deps,
      true
    )
    expect(api.viewerBatch).not.toHaveBeenCalled()
    expect(kept[0].title).toBe('In the grid')
  })

  it('leaves the list as it was when the request fails', async () => {
    const api = deps(async () => {
      throw new Error('unreachable')
    })
    const held = [listing('a'), listing('b')]
    expect(await reconcileRecentlyViewedList(held, [], api.deps, true)).toBe(
      held
    )
  })
})

describe('reconcileRecentlyViewedList signed out', () => {
  it('reads each listing on its own, as the batch is for signed-in readers', async () => {
    const api = deps(async () => [])
    api.get.mockResolvedValue({ listing: listing('a', { photo: null }) })
    await reconcileRecentlyViewedList([listing('a')], [], api.deps, false)
    expect(api.viewerBatch).not.toHaveBeenCalled()
    expect(api.get).toHaveBeenCalledWith('a')
  })
})
