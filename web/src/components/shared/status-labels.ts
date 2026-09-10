// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useLingui } from '@lingui/react/macro'

// Translated label for every listing, order, auction and dispute status token.
export function useStatusLabels(): Record<string, string> {
  const { t } = useLingui()
  return {
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
}
