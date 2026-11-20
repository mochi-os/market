// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { describe, expect, it } from 'vitest'
import { stockForType } from './stock'

const physical = { type: 'physical', quantity: '3', unlimited: false }

describe('stockForType', () => {
  it('gives a listing turned digital unlimited stock', () => {
    expect(stockForType('digital', physical, null, false)).toEqual({
      quantity: '0',
      unlimited: true,
      physical: { quantity: '3', unlimited: false },
    })
  })

  it('gives the count back when it is turned physical again', () => {
    const digital = stockForType('digital', physical, null, false)
    expect(
      stockForType(
        'physical',
        { type: 'digital', quantity: digital.quantity, unlimited: true },
        digital.physical,
        false
      )
    ).toEqual({ quantity: '3', unlimited: false, physical: null })
  })

  it('leaves stock the seller set alone', () => {
    expect(stockForType('digital', physical, null, true)).toEqual({
      quantity: '3',
      unlimited: false,
      physical: null,
    })
  })
})
