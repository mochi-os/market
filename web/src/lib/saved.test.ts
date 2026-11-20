// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Listing } from '@/types'
import { describe, it, expect, vi } from 'vitest'
import { isSaved, toggleSaved } from './saved'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
}))

vi.mock('@/api/saved', () => ({ savedApi: api }))

const listing = (id: string) => ({ id, title: id }) as unknown as Listing
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

// One store for the module, so each case saves listings of its own.
describe('saved listings', () => {
  it('takes the saved list an addition answered', async () => {
    api.add.mockResolvedValueOnce({
      saved: [listing('b'), listing('c')],
      total: 2,
    })

    toggleSaved(listing('b'))
    await flush()

    expect(isSaved('c')).toBe(true)
  })

  it('keeps the addition when an older server answers a flag', async () => {
    api.add.mockResolvedValueOnce({ saved: true })

    toggleSaved(listing('d'))
    await flush()

    expect(isSaved('d')).toBe(true)
  })
})
