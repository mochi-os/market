// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// Stored via shellStorage: inside the menu shell raw localStorage is per opaque
// origin and loses everything on each load. Reads are therefore asynchronous.
import type { Listing } from '@/types'
import { shellStorage } from '@mochi/web'
import { accountKey } from './account-key'

const MAX = 8

// Each signed-in account keeps its own list in a browser it shares.
function key(): string {
  return accountKey('market:recently-viewed')
}

export async function getRecentlyViewed(): Promise<Listing[]> {
  try {
    const raw = await shellStorage.getItem(key())
    return raw ? (JSON.parse(raw) as Listing[]) : []
  } catch {
    return []
  }
}

export async function addRecentlyViewed(listing: Listing): Promise<void> {
  const current = (await getRecentlyViewed()).filter((l) => l.id !== listing.id)
  shellStorage.setItem(
    key(),
    JSON.stringify([listing, ...current].slice(0, MAX))
  )
}

export function clearRecentlyViewed(): void {
  shellStorage.removeItem(key())
}

// Overwrite the whole list (used to reconcile against live data: drop removed
// listings, backfill thumbnails).
export function setRecentlyViewedList(list: Listing[]): void {
  shellStorage.setItem(key(), JSON.stringify(list.slice(0, MAX)))
}
