// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Order } from '@/types'
import type { Dispute } from '@/api/disputes'

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
