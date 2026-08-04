// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useLingui } from '@lingui/react/macro'
import { StatusPill, humanizeStatus, type StatusTone } from '@mochi/web'

const statusTones: Record<string, StatusTone> = {
  // Listing statuses
  draft: 'neutral',
  active: 'success',
  sold: 'accent',
  expired: 'warning',
  removed: 'neutral',
  rejected: 'danger',
  // Order statuses
  // `pending` is used by subscriptions in mid-checkout state (orders no longer
  // have a pending status).
  pending: 'warning',
  paid: 'accent',
  shipped: 'accent',
  delivered: 'info',
  completed: 'success',
  disputed: 'danger',
  refunded: 'caution',
  cancelled: 'neutral',
  // Subscription statuses
  scheduled: 'accent',
  paused: 'warning',
  payment_overdue: 'danger',
  // Auction statuses
  ended_sold: 'success',
  ended_unsold: 'warning',
  outbid: 'caution',
  won: 'success',
  lost: 'neutral',
  purchased: 'accent',
  // Dispute statuses
  hold: 'warning',
  open: 'warning',
  responded: 'info',
  resolved_buyer: 'caution',
  resolved_seller: 'success',
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLingui()
  const labels: Record<string, string> = {
    draft: t`Draft`,
    active: t`Active`,
    sold: t`Sold`,
    expired: t`Expired`,
    removed: t`Removed`,
    rejected: t`Rejected`,
    pending: t`Pending`,
    paid: t`Paid`,
    shipped: t`Shipped`,
    delivered: t`Delivered`,
    completed: t`Completed`,
    disputed: t`Disputed`,
    refunded: t`Refunded`,
    cancelled: t`Cancelled`,
    scheduled: t`Scheduled`,
    ended_sold: t`Ended (sold)`,
    ended_unsold: t`Ended (unsold)`,
    outbid: t`Outbid`,
    won: t`Won`,
    lost: t`Lost`,
    purchased: t`Purchased`,
    payment_overdue: t`Payment overdue`,
    paused: t`Paused`,
    hold: t`Held for review`,
    open: t({ message: 'Open', context: 'state' }),
    responded: t`Responded`,
    resolved_buyer: t`Resolved (buyer)`,
    resolved_seller: t`Resolved (seller)`,
  }
  return (
    <StatusPill tone={statusTones[status]}>
      {labels[status] ?? humanizeStatus(status)}
    </StatusPill>
  )
}
