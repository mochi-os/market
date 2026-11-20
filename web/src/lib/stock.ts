// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// A listing's stock as the editor holds it: the count typed, and whether it is
// unlimited (sent as 0).
export interface StockSetting {
  quantity: string
  unlimited: boolean
}

// stockForType(next, current, physical, touched) -> the stock after a change
// of listing type, and the physical count to hold for a change back. A
// download does not run out, so a listing turned digital is given unlimited
// stock; turned back to physical, it gets the count it had. Stock the seller
// has set is theirs, and no change of type alters it.
export function stockForType(
  next: string,
  current: StockSetting & { type: string },
  physical: StockSetting | null,
  touched: boolean
): StockSetting & { physical: StockSetting | null } {
  const kept = {
    quantity: current.quantity,
    unlimited: current.unlimited,
    physical,
  }
  if (touched || next === current.type) return kept
  if (next === 'digital') {
    return {
      quantity: '0',
      unlimited: true,
      physical: { quantity: current.quantity, unlimited: current.unlimited },
    }
  }
  if (physical) return { ...physical, physical: null }
  return kept
}
