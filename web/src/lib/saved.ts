// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { msg } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { toastAction, getErrorMessage } from '@mochi/web'
import type { Listing } from '@/types'
import { savedApi } from '@/api/saved'

// Saved listings are persisted server-side (market app's own per-user DB) so
// they survive reloads and logout and sync across the user's devices. This
// module keeps a synchronous in-memory mirror of that server state so the rest
// of the app can read `isSaved()` / `getSaved()` without awaiting, while
// mutations apply optimistically and reconcile with the server in the
// background. Call `loadSaved()` once after login to hydrate the mirror.

const EVENT = 'market:saved:changed'

let cache: Listing[] = []
let inflight: Promise<void> | null = null

function emit(): void {
  window.dispatchEvent(new Event(EVENT))
}

export function getSaved(): Listing[] {
  return [...cache]
}

export function isSaved(id: string):boolean {
  return cache.some((l) => l.id === id)
}

// Fetch the saved list from the server and populate the mirror. Safe to call
// repeatedly; concurrent calls share one request. Errors (e.g. a transient
// network blip or a 401 before login completes) are swallowed so the bookmark
// UI degrades gracefully rather than throwing.
export function loadSaved(): Promise<void> {
  if (inflight) return inflight
  inflight = savedApi
    .list()
    .then((res) => {
      cache = res.saved ?? []
      emit()
    })
    .catch(() => {
      // Leave the existing cache untouched on failure.
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

function addSaved(listing: Listing): void {
  if (isSaved(listing.id)) return
  cache = [listing, ...cache]
  emit()
  void toastAction(savedApi.add(listing), {
    loading: i18n._(msg`Saving...`),
    success: i18n._(msg`Saved`),
    error: (e) => getErrorMessage(e, i18n._(msg`Failed to save listing`)),
  }).catch(() => {
    cache = cache.filter((l) => l.id !== listing.id)
    emit()
  })
}

function removeSaved(id: string):void {
  const previous = cache.find((l) => l.id === id)
  if (!previous) return
  cache = cache.filter((l) => l.id !== id)
  emit()
  void toastAction(savedApi.remove(id), {
    loading: i18n._(msg`Removing...`),
    success: i18n._(msg`Removed from saved`),
    error: (e) => getErrorMessage(e, i18n._(msg`Failed to remove saved listing`)),
  }).catch(() => {
    cache = [previous, ...cache]
    emit()
  })
}

export function toggleSaved(listing: Listing): boolean {
  if (isSaved(listing.id)) {
    removeSaved(listing.id)
    return false
  }
  addSaved(listing)
  return true
}

export function clearSaved(): void {
  const previous = cache
  cache = []
  emit()
  void toastAction(savedApi.clear(), {
    loading: i18n._(msg`Clearing saved listings...`),
    success: i18n._(msg`Saved listings cleared`),
    error: (e) => getErrorMessage(e, i18n._(msg`Failed to clear saved listings`)),
  }).catch(() => {
    cache = previous
    emit()
  })
}

export function onSavedChange(cb: () => void): () => void {
  const handler = () => cb()
  window.addEventListener(EVENT, handler)
  return () => {
    window.removeEventListener(EVENT, handler)
  }
}
