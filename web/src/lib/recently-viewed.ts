import type { Listing } from '@/types'

const KEY = 'market:recently-viewed'
const MAX = 8

export function getRecentlyViewed(): Listing[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Listing[]) : []
  } catch {
    return []
  }
}

export function addRecentlyViewed(listing: Listing): void {
  const current = getRecentlyViewed().filter((l) => l.id !== listing.id)
  localStorage.setItem(
    KEY,
    JSON.stringify([listing, ...current].slice(0, MAX)),
  )
}

export function clearRecentlyViewed(): void {
  localStorage.removeItem(KEY)
}

// Overwrite the whole list (used to reconcile against live data: drop removed
// listings, backfill thumbnails).
export function setRecentlyViewedList(list: Listing[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    // ignore quota/serialization errors
  }
}
