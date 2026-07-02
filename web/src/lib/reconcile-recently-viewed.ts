// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { ListingDetailResponse } from '@/api/listings'
import type { photosApi } from '@/api/photos'
import type { listingsApi } from '@/api/listings'
import type { Listing } from '@/types'

export const RECONCILE_CONCURRENCY = 3

const IDLE_TIMEOUT_MS = 2000

export interface ReconcileRecentlyViewedDeps {
  listingsApi: typeof listingsApi
  photosApi: typeof photosApi
}

export function scheduleIdleTask(
  run: () => void,
  options?: { timeout?: number },
): () => void {
  const timeout = options?.timeout ?? IDLE_TIMEOUT_MS

  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(run, { timeout })
    return () => cancelIdleCallback(id)
  }

  const id = setTimeout(run, 0)
  return () => clearTimeout(id)
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []

  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await fn(items[index], index)
    }
  }

  const workers = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

export async function reconcileRecentlyViewedEntry(
  entry: Listing,
  allListings: Listing[],
  deps: ReconcileRecentlyViewedDeps,
): Promise<Listing | null> {
  const inGrid = allListings.find((l) => l.id === entry.id)
  if (inGrid) return inGrid

  let live: ListingDetailResponse
  try {
    live = await deps.listingsApi.get(entry.id)
    if (live.listing.status !== 'active') return null
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    return status === 404 ? null : entry
  }

  if (live.listing.photo) return live.listing
  if (entry.photo) return { ...live.listing, photo: entry.photo }

  try {
    const photos = await deps.photosApi.list(entry.id)
    return photos.length > 0 ? { ...live.listing, photo: photos[0] } : live.listing
  } catch {
    return live.listing
  }
}

export async function reconcileRecentlyViewedList(
  recentlyViewed: Listing[],
  allListings: Listing[],
  deps: ReconcileRecentlyViewedDeps,
): Promise<Listing[]> {
  const reconciled = await mapWithConcurrency(
    recentlyViewed,
    RECONCILE_CONCURRENCY,
    (entry) => reconcileRecentlyViewedEntry(entry, allListings, deps),
  )
  return reconciled.filter((x): x is Listing => x != null)
}
