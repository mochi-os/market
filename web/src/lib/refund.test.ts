// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Order } from '@/types'
import { describe, expect, it } from 'vitest'
import type { Dispute } from '@/api/disputes'
import { refundable } from './refund'

// The order as a seller receives it: the server strips its Stripe reference.
function order(fields: Partial<Order> = {}): Order {
  return { status: 'paid', total: 2000, refunded: 0, ...fields } as Order
}

function dispute(opener: string, status: string): Dispute {
  return { opener, status } as Dispute
}

describe('refundable', () => {
  it('offers a refund on a paid order with money left', () => {
    expect(refundable(order())).toBe(true)
    expect(refundable(order({ status: 'shipped', refunded: 500 }))).toBe(true)
  })

  it('offers none on a free order', () => {
    expect(refundable(order({ total: 0 }))).toBe(false)
  })

  it('offers none once refunded in full or cancelled', () => {
    expect(refundable(order({ refunded: 2000 }))).toBe(false)
    expect(refundable(order({ status: 'refunded', refunded: 2000 }))).toBe(
      false
    )
    expect(refundable(order({ status: 'cancelled' }))).toBe(false)
  })

  it('offers none while a chargeback is open', () => {
    const open = dispute('stripe', 'open')
    expect(refundable(order({ status: 'disputed' }), open)).toBe(false)
  })

  it('offers one after a chargeback closes, and over a buyer dispute', () => {
    expect(refundable(order(), dispute('stripe', 'resolved_seller'))).toBe(true)
    const buyer = dispute('buyer', 'open')
    expect(refundable(order({ status: 'disputed' }), buyer)).toBe(true)
  })
})
