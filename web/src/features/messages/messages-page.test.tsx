// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Thread } from '@/types'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessagesPage } from './messages-page'

const state = vi.hoisted(() => ({
  mine: vi.fn(),
  loaded: null as unknown as Record<string, unknown>,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLoaderData: () => state.loaded,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/api/threads', () => ({ threadsApi: { mine: state.mine } }))

function thread(id: string, fields: Partial<Thread> = {}): Thread {
  return {
    id,
    listing: 'l1',
    order: '',
    buyer: 'b1',
    seller: 's1',
    created: 1,
    updated: 1,
    title: 'Teapot',
    other: 's1',
    ...fields,
  }
}

const settle = () => act(() => Promise.resolve())

function show(threads: Thread[], total: number, next?: string) {
  state.loaded = { data: { threads, total, next }, error: null }
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <MessagesPage />
      </I18nProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  state.mine.mockReset()
})

describe('Messages', () => {
  it('names the other party, else their fingerprint, never an id', () => {
    show(
      [
        thread('t1', { other_name: 'Grace Hopper' }),
        thread('t2', { other_name: '', other_fingerprint: 'abcdefghi' }),
      ],
      2,
      ''
    )
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('abc-def-ghi')).toBeInTheDocument()
    expect(screen.queryByText(/t2/)).toBeNull()
  })

  it('pages after the last conversation it holds', async () => {
    state.mine.mockResolvedValue({
      threads: [thread('t2', { other_name: 'Later' })],
      total: 2,
      next: '',
    })
    show([thread('t1', { other_name: 'First' })], 2, 'c1')
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    await settle()
    expect(state.mine).toHaveBeenCalledWith({ page: 2, limit: 20, after: 'c1' })
    expect(screen.getByText('Later')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
  })
})
