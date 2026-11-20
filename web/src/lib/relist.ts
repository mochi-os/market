// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// A relisted auction's settings, handed from the page that relisted it to the
// editor of the new draft: the Comptroller answers them with the relist and
// does not keep them on the draft.

export interface RelistAuction {
  reserve: number
  instant: number
  opens: number
  closes: number
  extend: number
  extension: number
}

// What the editor takes: the duration as one of the lengths it offers.
export interface RelistSettings {
  reserve: number
  instant: number
  duration: string
  // Absent when held by a page that predates them.
  extend?: number
  extension?: number
}

function key(listing: string): string {
  return `relist:${listing}`
}

// nearestDuration(seconds, offered) -> string: The offered length in days
// nearest to the auction's, so the editor's picker shows one of its own.
export function nearestDuration(seconds: number, offered: string[]): string {
  const days = seconds / 86400
  let best = offered[0] ?? '7'
  for (const value of offered) {
    if (Math.abs(Number(value) - days) < Math.abs(Number(best) - days)) {
      best = value
    }
  }
  return best
}

// rememberRelist(listing, auction, offered): Hold the relisted auction's
// settings for the new draft's editor. Best-effort: sessionStorage can throw on
// an opaque origin in strict browsers, and losing them must not stop the relist.
export function rememberRelist(
  listing: string,
  auction: RelistAuction,
  offered: string[]
): void {
  const settings: RelistSettings = {
    reserve: auction.reserve,
    instant: auction.instant,
    duration: nearestDuration(auction.closes - auction.opens, offered),
    extend: auction.extend,
    extension: auction.extension,
  }
  try {
    sessionStorage.setItem(key(listing), JSON.stringify(settings))
  } catch {
    // the settings are lost; the relist stands
  }
}

// Settings already taken this session, so a render repeated in development
// reads what the first one took.
const taken = new Map<string, RelistSettings>()

// takeRelist(listing) -> settings or null: The settings held for a draft,
// taken out of storage on the first read.
export function takeRelist(listing: string): RelistSettings | null {
  const held = taken.get(listing)
  if (held) return held
  try {
    const raw = sessionStorage.getItem(key(listing))
    sessionStorage.removeItem(key(listing))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<RelistSettings> | null
    if (!value || typeof value !== 'object') return null
    const settings: RelistSettings = {
      reserve: Number(value.reserve) || 0,
      instant: Number(value.instant) || 0,
      duration: String(value.duration ?? '7'),
      extend: value.extend === undefined ? undefined : Number(value.extend),
      extension:
        value.extension === undefined ? undefined : Number(value.extension),
    }
    taken.set(listing, settings)
    return settings
  } catch {
    return null
  }
}
