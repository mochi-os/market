// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// Cursor paging over the Comptroller's list events. Each answer carries `next`,
// the cursor of its last row, or "" when nothing follows; the next request
// sends it back as `after` and is answered the rows after that row, so a row
// added or moved ahead of it cannot shift the page onto rows already held.
// `page` is still sent, which a Comptroller that predates cursors pages by.
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { getErrorMessage, toast } from '@mochi/web'

export interface CursorPage<T> {
  items: T[]
  total: number
  // Absent from a Comptroller that predates cursors.
  next?: string
}

export interface CursorRequest {
  page: number
  limit: number
  after?: string
}

// pagesRemain(held, total, next) -> boolean: Whether another page follows: ""
// ends the list; without a cursor, the rows held against the total.
export function pagesRemain(
  held: number,
  total: number,
  next: string | undefined
): boolean {
  return next === undefined ? held < total : next !== ''
}

// appendPage(held, rows, id) -> rows: The held rows with a page's rows after
// them, leaving out any row already held, so a list keyed by id never holds
// one twice.
export function appendPage<T>(
  held: T[],
  rows: T[],
  id: (row: T) => string
): T[] {
  const seen = new Set(held.map(id))
  const fresh: T[] = []
  for (const row of rows) {
    const key = id(row)
    if (seen.has(key)) continue
    seen.add(key)
    fresh.push(row)
  }
  return fresh.length === 0 ? held : [...held, ...fresh]
}

// nextCursor(sent, answered, added) -> cursor: What to ask the next page
// with: the answer's cursor, or the end once a page adds no row or hands back
// the cursor it was asked with, so a server that repeats itself cannot hold a
// list in a loop of requests.
export function nextCursor(
  sent: string | undefined,
  answered: string | undefined,
  added: number
): string | undefined {
  if (added === 0) return ''
  if (answered && answered === sent) return ''
  return answered
}

// pageRequest(page, limit, next) -> CursorRequest: What asks for the page after
// one that answered next.
export function pageRequest(
  page: number,
  limit: number,
  next: string | undefined
): CursorRequest {
  return next ? { page, limit, after: next } : { page, limit }
}

// everyPage(read, id, limit) -> rows: Every row of a list, page after page, until
// the answer says nothing follows. A cursor answered twice ends it too, so a
// Comptroller that repeats one cannot hold the caller in a loop.
export async function everyPage<T>(
  read: (request: CursorRequest) => Promise<CursorPage<T>>,
  id: (row: T) => string,
  limit = 100
): Promise<T[]> {
  let rows: T[] = []
  let page = 1
  let next: string | undefined
  const asked = new Set<string>()
  for (;;) {
    const request = pageRequest(page, limit, next)
    const answer = await read(request)
    const held = rows.length
    rows = appendPage(rows, answer.items, id)
    next = nextCursor(request.after, answer.next, rows.length - held)
    if (!pagesRemain(rows.length, answer.total, next)) return rows
    if (next !== undefined) {
      if (asked.has(next)) return rows
      asked.add(next)
    }
    page += 1
  }
}

export interface UseCursorListOptions<T, P> {
  fetcher: (params: P & CursorRequest) => Promise<CursorPage<T>>
  // The first page as the route's loader read it.
  initial?: CursorPage<T>
  params?: P
  limit?: number
  id: (row: T) => string
  // The toast for a page that cannot be read, when the server says nothing.
  failure: string
}

export interface UseCursorListResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  isLoading: boolean
  // The last request failed: an automatic trigger must wait for the user.
  failed: boolean
  loadMore: () => Promise<void>
  reset: () => Promise<void>
  setItems: Dispatch<SetStateAction<T[]>>
  setTotal: Dispatch<SetStateAction<number>>
}

export function useCursorList<T, P = Record<string, unknown>>(
  options: UseCursorListOptions<T, P>
): UseCursorListResult<T> {
  const { fetcher, initial, params, limit = 20, id, failure } = options
  const paramsKey = JSON.stringify(params ?? {})

  const [items, setItems] = useState<T[]>(initial?.items ?? [])
  const [total, setTotal] = useState(initial?.total ?? 0)
  const [next, setNext] = useState<string | undefined>(initial?.next)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  // The newest first page; an answer to an older one is dropped, so a filter
  // changed twice in quick succession cannot leave the first one's rows.
  const generation = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const firstRun = useRef(true)
  const paramsKeyRef = useRef(paramsKey)
  const fetcherRef = useRef(fetcher)
  const idRef = useRef(id)
  const failureRef = useRef(failure)
  const paramsRef = useRef(params)
  useEffect(() => {
    fetcherRef.current = fetcher
    idRef.current = id
    failureRef.current = failure
    paramsRef.current = params
  })

  // Keyed on the rows array: the wrapper is built inline by callers and is a
  // new object every render, while the rows change only when the loader runs.
  const initialItems = initial?.items
  const initialTotal = initial?.total
  const initialNext = initial?.next
  const initialRef = useRef(initialItems)
  useEffect(() => {
    if (initialItems && initialItems !== initialRef.current) {
      initialRef.current = initialItems
      generation.current += 1
      setItems(initialItems)
      setTotal(initialTotal ?? 0)
      setNext(initialNext)
      setPage(1)
      setFailed(false)
      setIsLoading(false)
    }
  }, [initialItems, initialTotal, initialNext])

  const fetchPage = useCallback(
    async (request: CursorRequest, replace: boolean) => {
      if (replace) generation.current += 1
      const current = generation.current
      setIsLoading(true)
      try {
        const answer = await fetcherRef.current({
          ...(paramsRef.current ?? ({} as P)),
          ...request,
        })
        if (current !== generation.current) return
        const held = replace ? [] : itemsRef.current
        const merged = appendPage(held, answer.items, idRef.current)
        itemsRef.current = merged
        setItems(merged)
        setTotal(answer.total)
        setNext(
          replace
            ? answer.next
            : nextCursor(
                request.after,
                answer.next,
                merged.length - held.length
              )
        )
        setPage(request.page)
        setFailed(false)
      } catch (err) {
        if (current !== generation.current) return
        setFailed(true)
        toast.error(getErrorMessage(err, failureRef.current))
      } finally {
        if (current === generation.current) setIsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      paramsKeyRef.current = paramsKey
      return
    }
    if (paramsKeyRef.current === paramsKey) return
    paramsKeyRef.current = paramsKey
    void fetchPage({ page: 1, limit }, true)
  }, [paramsKey, limit, fetchPage])

  const hasMore = pagesRemain(items.length, total, next)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    await fetchPage(pageRequest(page + 1, limit, next), false)
  }, [fetchPage, hasMore, isLoading, limit, next, page])

  const reset = useCallback(
    () => fetchPage({ page: 1, limit }, true),
    [fetchPage, limit]
  )

  return {
    items,
    total,
    hasMore,
    isLoading,
    failed,
    loadMore,
    reset,
    setItems,
    setTotal,
  }
}
