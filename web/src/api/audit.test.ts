// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { describe, expect, it, vi } from 'vitest'
import { auditApi } from './audit'

const post = vi.hoisted(() => vi.fn())
vi.mock('./client', () => ({ client: { post } }))

const entry = (id: string) => ({ id, action: 'order.paid' })

describe('auditApi.all', () => {
  it("reads an object's whole trail, page after page", async () => {
    post
      .mockResolvedValueOnce({
        data: { audit: [entry('a1'), entry('a2')], total: 3, next: 'c1' },
      })
      .mockResolvedValueOnce({
        data: { audit: [entry('a3')], total: 3, next: '' },
      })
    const { audit } = await auditApi.all({
      kind: 'order',
      object: 'o1',
      limit: 2,
    })
    expect(audit.map((e) => e.id)).toEqual(['a1', 'a2', 'a3'])
    expect(post.mock.calls.map((call) => call[1])).toEqual([
      { kind: 'order', object: 'o1', page: 1, limit: 2 },
      { kind: 'order', object: 'o1', page: 2, limit: 2, after: 'c1' },
    ])
  })
})
