// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Listing } from '@/types'
import { useAuthStore } from '@mochi/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addRecentlyViewed, getRecentlyViewed } from './recently-viewed'
import { isReported, markReported } from './reported'

// The shell's storage, as one browser holds it for every account.
const stored = vi.hoisted(() => new Map<string, string>())
vi.mock('@mochi/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mochi/web')>()),
  shellStorage: {
    getItem: async (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
  },
}))

function as(identity: string) {
  useAuthStore.setState({ identity, isAuthenticated: identity !== '' })
}

afterEach(() => {
  stored.clear()
  as('')
})

describe('per-account browser lists', () => {
  it("keeps one account's recently viewed from the next account", async () => {
    as('alice')
    await addRecentlyViewed({ id: 'l1' } as Listing)
    as('bob')
    expect(await getRecentlyViewed()).toEqual([])
    as('alice')
    expect((await getRecentlyViewed()).map((l) => l.id)).toEqual(['l1'])
  })

  it("keeps one account's reports from the next account", async () => {
    as('alice')
    await markReported('l1')
    as('bob')
    expect(await isReported('l1')).toBe(false)
    as('alice')
    expect(await isReported('l1')).toBe(true)
  })
})
