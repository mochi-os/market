// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { describe, expect, it } from 'vitest'
import { checkoutTotal } from './checkout'

const options = [
  { id: 'o1', price: 500 },
  { id: 'o2', price: 900 },
]

describe('checkoutTotal', () => {
  it('adds the chosen postage to a shipped order', () => {
    const { postage, total } = checkoutTotal(1000, 'shipping', options, 'o1')
    expect(postage?.id).toBe('o1')
    expect(total).toBe(1500)
  })

  it('leaves postage out once the buyer picks another delivery', () => {
    for (const delivery of ['pickup', 'download', '']) {
      const { postage, total } = checkoutTotal(1000, delivery, options, 'o1')
      expect(postage).toBeUndefined()
      expect(total).toBe(1000)
    }
  })

  it('charges nothing for postage before an option is chosen', () => {
    expect(checkoutTotal(1000, 'shipping', options, '').total).toBe(1000)
  })
})
