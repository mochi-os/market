// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listingsApi } from './listings'
import { photosApi } from './photos'

const { post, warning } = vi.hoisted(() => ({
  post: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('@mochi/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mochi/web')>()),
  createAppClient: () => ({
    get: vi.fn(),
    post,
  }),
  toast: { warning },
}))

// A listing's copy on another network that went without its photo says so
// beside the answer, a line each as the server words it.
describe('what a listing copy went without', () => {
  beforeEach(() => {
    post.mockReset()
    warning.mockReset()
  })

  it('is said when a listing is published, and the listing still answers', async () => {
    post.mockResolvedValue({
      data: { id: 'l1' },
      unsent: ['Without its photo'],
    })
    expect(await listingsApi.publish({ id: 'l1' })).toEqual({ id: 'l1' })
    expect(warning.mock.calls).toEqual([['Without its photo']])
  })

  it('is said when a photo is added, deleted or reordered', async () => {
    post.mockResolvedValueOnce({ data: { id: 'p1' }, unsent: ['Added'] })
    await photosApi.upload(
      'l1',
      new File(['x'], 'x.png', { type: 'image/png' })
    )
    post.mockResolvedValueOnce({ data: null, unsent: ['Deleted'] })
    await photosApi.delete('p1', 'l1')
    post.mockResolvedValueOnce({ data: null, unsent: ['Reordered'] })
    await photosApi.reorder('l1', ['p1'])
    expect(warning.mock.calls).toEqual([['Added'], ['Deleted'], ['Reordered']])
  })

  it('says nothing where every copy went whole', async () => {
    post.mockResolvedValue({ data: { id: 'l1' }, unsent: [] })
    await listingsApi.publish({ id: 'l1' })
    post.mockResolvedValue({ data: { id: 'l1' } })
    await listingsApi.publish({ id: 'l1' })
    expect(warning).not.toHaveBeenCalled()
  })
})
