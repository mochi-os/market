// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// Saved listings are persisted server-side (market app's own per-user DB) so
// they survive reloads and logout and sync across the user's devices. The
// mirror, the optimistic mutations and their rollback are the shared
// createSavedStore; market stores the listing itself rather than a snapshot of
// it, so the row and the input are the same shape here. Call `loadSaved()` once
// after login to hydrate the mirror.
import type { Listing } from '@/types'
import { msg } from '@lingui/core/macro'
import { createSavedStore } from '@mochi/web'
import { savedApi } from '@/api/saved'

const store = createSavedStore<Listing, Listing>({
  eventName: 'market:saved:changed',
  api: {
    list: async () => (await savedApi.list()).saved ?? [],
    add: (listing) => savedApi.add(listing),
    remove: (id) => savedApi.remove(id),
    clear: () => savedApi.clear(),
  },
  itemId: (listing) => listing.id,
  inputId: (listing) => listing.id,
  toItem: (listing) => listing,
  messages: {
    saving: msg`Saving...`,
    saved: msg`Saved`,
    addFailed: msg`Failed to save listing`,
    removing: msg`Removing...`,
    removed: msg`Removed from saved`,
    removeFailed: msg`Failed to remove saved listing`,
    clearing: msg`Clearing saved listings...`,
    cleared: msg`Saved listings cleared`,
    clearFailed: msg`Failed to clear saved listings`,
  },
})

export const {
  getSaved,
  isSaved,
  loadSaved,
  toggleSaved,
  clearSaved,
  onSavedChange,
} = store
