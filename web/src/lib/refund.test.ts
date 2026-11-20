// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Order } from '@/types'
import { describe, expect, it } from 'vitest'
import type { Dispute } from '@/api/disputes'
import { refundable, refundAmount } from './refund'

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

describe('refundAmount', () => {
  it('sends no amount for a full refund', () => {
    expect(refundAmount('', 2000, 'gbp')).toEqual({})
    expect(refundAmount('  ', 2000, 'gbp')).toEqual({})
    expect(refundAmount('20.00', 2000, 'gbp')).toEqual({})
  })

  it('sends a part of the remainder in minor units', () => {
    expect(refundAmount('5', 2000, 'gbp')).toEqual({ amount: 500 })
    expect(refundAmount('0.01', 2000, 'gbp')).toEqual({ amount: 1 })
    expect(refundAmount('150', 2000, 'jpy')).toEqual({ amount: 150 })
  })

  it('refuses nothing, zero and anything that rounds to zero', () => {
    for (const text of ['0', '0.00', '.', '0.004']) {
      expect(refundAmount(text, 2000, 'gbp')).toBeNull()
    }
  })

  it('refuses more than the remainder', () => {
    expect(refundAmount('20.01', 2000, 'gbp')).toBeNull()
  })

  it('refuses text that is not an amount in the currency', () => {
    for (const text of ['-5', '£5', '1e3', '5.001', 'five']) {
      expect(refundAmount(text, 2000, 'gbp')).toBeNull()
    }
    expect(refundAmount('1.5', 2000, 'jpy')).toBeNull()
  })
})
