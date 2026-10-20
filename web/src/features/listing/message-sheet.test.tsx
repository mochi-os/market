// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageSheet } from './message-sheet'

const api = vi.hoisted(() => ({
  report: vi.fn(),
  // Whoever is reading the conversation.
  reader: { id: 's1' },
}))

vi.mock('@/api/threads', () => ({
  threadsApi: {
    get: () =>
      Promise.resolve({
        thread: {
          id: 't1',
          listing: 'l1',
          order: '',
          buyer: 'b1',
          seller: 's1',
          created: 0,
          updated: 0,
        },
        messages: [],
        listing: { id: 'l1', title: 'Hunting knife' },
      }),
    create: vi.fn(),
  },
  messagesApi: { read: () => Promise.resolve(), send: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { create: api.report } }))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ account: api.reader }),
}))

class Socket {
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: (() => void) | null = null
  close() {}
}

// Lets queued promises run: the thread loading, and a request answering.
const settle = () => act(() => Promise.resolve())

function show() {
  return render(
    <I18nProvider i18n={i18n}>
      <MessageSheet
        listingId='l1'
        listingTitle='Hunting knife'
        threadId='t1'
        open
        onOpenChange={() => {}}
      />
    </I18nProvider>
  )
}

beforeEach(() => {
  api.report.mockReset().mockResolvedValue({})
  api.reader = { id: 's1' }
  vi.stubGlobal('WebSocket', Socket)
})

describe('Reporting a conversation', () => {
  it('files a user report that names the conversation and its other party', async () => {
    show()
    await settle()
    await settle()
    fireEvent.click(
      screen.getByRole('button', { name: 'Report this conversation' })
    )
    expect(screen.getByText('Report conversation')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))
    await settle()
    expect(api.report).toHaveBeenCalledTimes(1)
    expect(api.report).toHaveBeenCalledWith({
      target: 'b1',
      type: 'user',
      thread: 't1',
      reason: 'prohibited',
      details: '',
    })
  })

  it('names the seller when the buyer reports', async () => {
    api.reader = { id: 'b1' }
    show()
    await settle()
    await settle()
    fireEvent.click(
      screen.getByRole('button', { name: 'Report this conversation' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))
    await settle()
    expect(api.report).toHaveBeenCalledWith(
      expect.objectContaining({ target: 's1', thread: 't1' })
    )
  })

  it('offers the reasons that fit a conversation', async () => {
    show()
    await settle()
    await settle()
    fireEvent.click(
      screen.getByRole('button', { name: 'Report this conversation' })
    )
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    expect(
      screen.getByRole('option', { name: 'Spam or scam' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'Counterfeit or stolen' })
    ).toBeNull()
    expect(
      screen.queryByRole('option', { name: 'Misleading description' })
    ).toBeNull()
  })

  it('offers no report before the conversation has loaded', () => {
    show()
    expect(
      screen.queryByRole('button', { name: 'Report this conversation' })
    ).toBeNull()
  })
})
