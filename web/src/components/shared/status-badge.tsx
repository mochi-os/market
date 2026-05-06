import { useLingui } from '@lingui/react/macro'
import { Badge } from '@mochi/web'

/* eslint-disable lingui/no-unlocalized-strings -- Tailwind utility-class strings */
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sold: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  expired:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  removed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  // Used by subscriptions in mid-checkout state (orders no longer have a pending status).
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  shipped:
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  delivered:
    'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  completed:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  cancelled:
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  scheduled:
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  ended_sold:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ended_unsold:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  outbid:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  lost: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  purchased:
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  payment_overdue:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  paused:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  responded:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  resolved_buyer:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  resolved_seller:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}
/* eslint-enable lingui/no-unlocalized-strings */

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLingui()
  const labels: Record<string, string> = {
    draft: t`Draft`,
    active: t`Active`,
    sold: t`Sold`,
    expired: t`Expired`,
    removed: t`Removed`,
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
    open: t`Open`,
    responded: t`Responded`,
    resolved_buyer: t`Resolved (buyer)`,
    resolved_seller: t`Resolved (seller)`,
  }
  const label =
    labels[status] ??
    status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  return (
    <Badge variant='outline' className={statusColors[status] ?? ''}>
      {label}
    </Badge>
  )
}
