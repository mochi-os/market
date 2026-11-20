// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Message } from '@/types'

// mergeMessages(held, incoming) -> messages: A conversation's messages with
// those just read or sent, each once, oldest first. A message is never taken
// away, so a read begun before a send cannot drop the message the send added
// when it answers after it, and a send answered after a read that already
// holds its message cannot add it twice.
export function mergeMessages(held: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>()
  for (const message of held) byId.set(message.id, message)
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.created - b.created)
}
