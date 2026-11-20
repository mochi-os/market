// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  appendPage,
  everyPage,
  nextCursor,
  pageRequest,
  pagesRemain,
  useCursorList,
  type CursorPage,
  type CursorRequest,
} from './paging'

const toasts = vi.hoisted(() => ({ error: vi.fn() }))
vi.mock('@mochi/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mochi/web')>()),
  toast: { error: toasts.error },
}))

interface Row {
  id: string
}

const rows = (...ids: string[]): Row[] => ids.map((id) => ({ id }))
const id = (row: Row) => row.id

beforeEach(() => {
  toasts.error.mockReset()
})

describe('pagesRemain', () => {
  it('ends the list at an empty cursor', () => {
    expect(pagesRemain(20, 100, '')).toBe(false)
    expect(pagesRemain(20, 100, 'c1')).toBe(true)
  })

  it('counts against the total for a Comptroller with no cursor', () => {
    expect(pagesRemain(20, 21, undefined)).toBe(true)
    expect(pagesRemain(21, 21, undefined)).toBe(false)
  })
})

describe('appendPage', () => {
  it('appends the rows after the last row held', () => {
    expect(appendPage(rows('a', 'b'), rows('c', 'd'), id)).toEqual(
      rows('a', 'b', 'c', 'd')
    )
  })

  it('never holds a row twice', () => {
    expect(appendPage(rows('a', 'b'), rows('b', 'c', 'c'), id)).toEqual(
      rows('a', 'b', 'c')
    )
  })
})

describe('nextCursor', () => {
  it("follows the answer's cursor while pages add rows", () => {
    expect(nextCursor('c1', 'c2', 3)).toBe('c2')
    expect(nextCursor(undefined, undefined, 3)).toBeUndefined()
  })

  it('ends the list at a page that adds nothing, or repeats its cursor', () => {
    expect(nextCursor('c1', 'c2', 0)).toBe('')
    expect(nextCursor('c1', 'c1', 3)).toBe('')
  })
})

describe('pageRequest', () => {
  it('sends the cursor as after, and the page beside it', () => {
    expect(pageRequest(2, 20, 'c1')).toEqual({
      page: 2,
      limit: 20,
      after: 'c1',
    })
  })

  it('sends no after without a cursor', () => {
    expect(pageRequest(2, 20, undefined)).toEqual({ page: 2, limit: 20 })
  })
})

describe('everyPage', () => {
  it('follows the cursor until it is empty', async () => {
    const pages: Record<string, CursorPage<Row>> = {
      first: { items: rows('a', 'b'), total: 5, next: 'c1' },
      c1: { items: rows('c', 'd'), total: 5, next: 'c2' },
      c2: { items: rows('e'), total: 5, next: '' },
    }
    const asked: CursorRequest[] = []
    const all = await everyPage(
      async (request) => {
        asked.push(request)
        return pages[request.after ?? 'first']
      },
      id,
      2
    )
    expect(all).toEqual(rows('a', 'b', 'c', 'd', 'e'))
    expect(asked).toEqual([
      { page: 1, limit: 2 },
      { page: 2, limit: 2, after: 'c1' },
      { page: 3, limit: 2, after: 'c2' },
    ])
  })

  it('stops at a cursor answered twice', async () => {
    const fetch = vi.fn(async (request: CursorRequest) => ({
      items: rows(`r${request.page}`),
      total: 100,
      next: 'same',
    }))
    const all = await everyPage(fetch, id, 1)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(all).toEqual(rows('r1', 'r2'))
  })

  it('pages by number for a Comptroller with no cursor', async () => {
    const fetch = vi.fn(async (request: CursorRequest) => ({
      items: request.page === 1 ? rows('a', 'b') : rows('c'),
      total: 3,
    }))
    expect(await everyPage(fetch, id, 2)).toEqual(rows('a', 'b', 'c'))
    expect(fetch.mock.calls[1][0]).toEqual({ page: 2, limit: 2 })
  })
})

describe('useCursorList', () => {
  function list(
    fetcher: (
      params: Record<string, unknown> & CursorRequest
    ) => Promise<CursorPage<Row>>,
    initial: CursorPage<Row>
  ) {
    return renderHook(() =>
      useCursorList<Row>({ fetcher, initial, id, failure: 'Failed' })
    )
  }

  it('asks for the rows after the last page, and appends them', async () => {
    const fetcher = vi.fn(async () => ({
      items: rows('b', 'c'),
      total: 3,
      next: '',
    }))
    const { result } = list(fetcher, {
      items: rows('a', 'b'),
      total: 3,
      next: 'c1',
    })
    expect(result.current.hasMore).toBe(true)
    await act(() => result.current.loadMore())
    expect(fetcher).toHaveBeenCalledWith({ page: 2, limit: 20, after: 'c1' })
    expect(result.current.items).toEqual(rows('a', 'b', 'c'))
  })

  it('stops at an empty cursor', async () => {
    const fetcher = vi.fn(async () => ({
      items: rows('z'),
      total: 9,
      next: '',
    }))
    const { result } = list(fetcher, { items: rows('a'), total: 9, next: '' })
    expect(result.current.hasMore).toBe(false)
    await act(() => result.current.loadMore())
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('says why a page failed, and marks the list failed', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('Comptroller unreachable')
    })
    const { result } = list(fetcher, { items: rows('a'), total: 9, next: 'c1' })
    await act(() => result.current.loadMore())
    expect(result.current.failed).toBe(true)
    expect(toasts.error).toHaveBeenCalledWith('Comptroller unreachable')
    expect(result.current.items).toEqual(rows('a'))
  })
})
