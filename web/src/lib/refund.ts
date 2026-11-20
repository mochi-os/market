// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Order } from '@/types'
import type { Dispute } from '@/api/disputes'
import { priceRegex, toMinorUnits } from './format'

// Whether the seller may refund the order, as the server allows: something is
// left to refund (a free order has nothing), the order is not refunded or
// cancelled, and no chargeback is open, since Stripe is already reclaiming that
// money and a refund beside it pays the buyer twice.
export function refundable(order: Order, dispute?: Dispute | null): boolean {
  const remaining = order.total - (order.refunded ?? 0)
  const chargeback = dispute?.opener === 'stripe' && dispute.status === 'open'
  return (
    !['refunded', 'cancelled'].includes(order.status) &&
    remaining > 0 &&
    !chargeback
  )
}

// refundAmount(text, remaining, currency) -> what a refund sends, or null for
// text that is no amount the seller may refund. Blank, or the whole remainder
// typed out, refunds everything left and sends no amount, as the Comptroller
// reads only a missing amount as everything. Anything else must be a positive
// amount in the currency's minor units no larger than the remainder: never 0,
// which an older Comptroller refunded in full.
export function refundAmount(
  text: string,
  remaining: number,
  currency: string
): { amount?: number } | null {
  const trimmed = text.trim()
  if (!trimmed) return {}
  if (!priceRegex(currency).test(trimmed)) return null
  const minor = toMinorUnits(trimmed, currency)
  if (!Number.isFinite(minor) || minor < 1 || minor > remaining) return null
  return minor === remaining ? {} : { amount: minor }
}
