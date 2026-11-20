// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useLingui } from '@lingui/react/macro'
import { StatusPill, type StatusTone } from '@mochi/web'
import { useStatusLabels } from '@/components/shared/status-labels'

const statusTones: Record<string, StatusTone> = {
  // Listing statuses
  draft: 'neutral',
  active: 'success',
  sold: 'accent',
  expired: 'warning',
  removed: 'neutral',
  rejected: 'danger',
  // Order statuses (`pending` belongs to subscriptions in mid-checkout)
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
  past_due: 'danger',
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

// A status the labels do not know, such as one a newer Comptroller added,
// reads Unknown rather than its raw token.
export function StatusBadge({ status }: { status: string }) {
  const { t } = useLingui()
  const labels = useStatusLabels()
  return (
    <StatusPill tone={statusTones[status]}>
      {labels[status] ?? t`Unknown`}
    </StatusPill>
  )
}
