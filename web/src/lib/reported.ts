// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// Persists via the shell storage proxy — see recently-viewed.ts for why raw
// localStorage is unusable inside the menu shell's sandboxed iframe.

import { shellStorage } from '@mochi/web'

const KEY = 'market:reported-listings'
const MAX = 500

async function read(): Promise<string[]> {
  try {
    const raw = await shellStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export async function isReported(id: string): Promise<boolean> {
  return (await read()).includes(id)
}

export async function markReported(id: string): Promise<void> {
  const cur = (await read()).filter((x) => x !== id)
  shellStorage.setItem(KEY, JSON.stringify([id, ...cur].slice(0, MAX)))
}
