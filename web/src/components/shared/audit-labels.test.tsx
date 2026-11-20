// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useActionLabels } from './audit-labels'

// Every action the Comptroller's log_audit writes, the composed ones
// (subscription.<status>, dispute.<status>, review.<action>,
// account.suspended/banned) spelled out. A key added there belongs here and in
// the labels.
const WRITTEN = [
  'account.banned',
  'account.seller_activated',
  'account.stripe_connected',
  'account.stripe_disconnected',
  'account.stripe_onboarded',
  'account.stripe_restricted',
  'account.suspended',
  'account.unbanned',
  'account.unsuspended',
  'auction.bid_placed',
  'auction.cancelled',
  'auction.created',
  'auction.ended_sold',
  'auction.ended_unsold',
  'auction.opened',
  'auction.payment_overdue',
  'audit.unknown_kind_probe',
  'category.created',
  'category.deleted',
  'category.updated',
  'config.thresholds_updated',
  'config.updated',
  'dispute.opened',
  'dispute.resolved_buyer',
  'dispute.resolved_seller',
  'dispute.responded',
  'listing.appeal_decided',
  'listing.appeal_submitted',
  'listing.approved',
  'listing.cleared',
  'listing.created',
  'listing.deleted',
  'listing.expired',
  'listing.published',
  'listing.rejected',
  'listing.relisted',
  'listing.removed',
  'listing.updated',
  'listing.warning',
  'order.cancelled',
  'order.chargeback',
  'order.chargeback_lost',
  'order.chargeback_won',
  'order.completed',
  'order.created',
  'order.paid',
  'order.payment_failed',
  'order.refunded',
  'order.shipped',
  'order.staff_read',
  'payment.orphaned',
  'report.actioned',
  'report.created',
  'review.created',
  'review.hide',
  'review.remove',
  'review.responded',
  'review.restore',
  'review.revealed',
  'staff.team_added',
  'staff.team_removed',
  'staff.team_role_changed',
  'subscription.activated',
  'subscription.active',
  'subscription.cancel_scheduled',
  'subscription.cancelled',
  'subscription.chargeback',
  'subscription.chargeback_lost',
  'subscription.chargeback_won',
  'subscription.created',
  'subscription.past_due',
  'subscription.paused',
  'subscription.reactivated',
  'subscription.resumed',
  'thread.staff_read',
]

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
)

describe('useActionLabels', () => {
  const labels = renderHook(() => useActionLabels(), { wrapper }).result.current

  it('labels every action the Comptroller writes', () => {
    expect(WRITTEN.filter((action) => !labels[action])).toEqual([])
  })

  it('labels a cancelled auction and a staff read of an order', () => {
    expect(labels['auction.cancelled']).toBe('Auction cancelled')
    expect(labels['order.staff_read']).toBe('Viewed by staff')
  })
})
