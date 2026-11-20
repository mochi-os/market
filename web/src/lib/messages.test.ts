// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Message } from '@/types'
import { describe, expect, it } from 'vitest'
import { mergeMessages } from './messages'

function message(id: string, created: number): Message {
  return {
    id,
    thread: 't1',
    sender: 's1',
    sender_name: '',
    sender_fingerprint: null,
    body: id,
    read: 0,
    created,
  }
}

const ids = (messages: Message[]) => messages.map((m) => m.id)

describe('mergeMessages', () => {
  it('keeps a sent message a read begun before the send did not see', () => {
    const sent = [message('m1', 1), message('m2', 2)]
    const read = [message('m1', 1)]
    expect(ids(mergeMessages(sent, read))).toEqual(['m1', 'm2'])
  })

  it('does not add a sent message twice after a read that holds it', () => {
    const read = [message('m1', 1), message('m2', 2)]
    expect(ids(mergeMessages(read, [message('m2', 2)]))).toEqual(['m1', 'm2'])
  })

  it('keeps the conversation oldest first', () => {
    const held = [message('m1', 1), message('m3', 3)]
    expect(ids(mergeMessages(held, [message('m2', 2)]))).toEqual([
      'm1',
      'm2',
      'm3',
    ])
  })
})
