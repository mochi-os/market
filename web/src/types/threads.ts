// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export interface Thread {
  id: string
  listing: string
  order: string
  buyer: string
  seller: string
  created: number
  updated: number
  title?: string
  last_message?: string
  last_message_time?: number
  unread?: number
  other_name?: string
}

export interface Message {
  id: string
  thread: string
  sender: string
  sender_name: string
  body: string
  read: number
  created: number
}
