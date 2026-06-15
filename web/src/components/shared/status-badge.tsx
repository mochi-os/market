import { useLingui } from '@lingui/react/macro'
import { Badge } from '@mochi/web'

/* eslint-disable lingui/no-unlocalized-strings -- Tailwind utility-class strings */
const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active:
    'bg-success/15 text-success dark:bg-success/20',
  sold: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  expired:
    'bg-warning/25 text-warning-foreground dark:bg-warning/15 dark:text-warning',
  removed: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive/10 text-destructive dark:bg-destructive/15',
  // Used by subscriptions in mid-checkout state (orders no longer have a pending status).
  pending:
    'bg-warning/25 text-warning-foreground dark:bg-warning/15 dark:text-warning',
  paid: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  shipped:
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  delivered:
    'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  completed:
    'bg-success/15 text-success dark:bg-success/20',
  disputed: 'bg-destructive/10 text-destructive dark:bg-destructive/15',
  refunded:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  cancelled:
    'bg-muted text-muted-foreground',
  scheduled:
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  ended_sold:
    'bg-success/15 text-success dark:bg-success/20',
  ended_unsold:
    'bg-warning/25 text-warning-foreground dark:bg-warning/15 dark:text-warning',
  outbid:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  won: 'bg-success/15 text-success dark:bg-success/20',
  lost: 'bg-muted text-muted-foreground',
  purchased:
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  payment_overdue:
    'bg-destructive/10 text-destructive dark:bg-destructive/15',
  paused:
    'bg-warning/25 text-warning-foreground dark:bg-warning/15 dark:text-warning',
  hold: 'bg-warning/25 text-warning-foreground dark:bg-warning/15 dark:text-warning',
  open: 'bg-warning/25 text-warning-foreground dark:bg-warning/15 dark:text-warning',
  responded:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  resolved_buyer:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  resolved_seller:
    'bg-success/15 text-success dark:bg-success/20',
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
  const label =
    labels[status] ??
    status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  return (
    <Badge variant='outline' className={statusColors[status] ?? ''}>
      {label}
    </Badge>
  )
}
