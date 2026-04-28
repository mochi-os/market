import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  useFormat,
  getErrorMessage,
} from '@mochi/web'
import { auditApi, type AuditEntry } from '@/api/audit'
import {
  DISPUTE_REASONS,
  REPORT_REASONS,
  STRIPE_CHARGEBACK_REASONS,
} from '@/config/constants'
import { formatFingerprint, useFormatPrice } from '@/lib/format'

const REASON_LABELS: Record<string, Record<string, string>> = {
  'dispute.opened': Object.fromEntries(
    DISPUTE_REASONS.map((r) => [r.value, r.label])
  ),
  'order.refund_requested': Object.fromEntries(
    DISPUTE_REASONS.map((r) => [r.value, r.label])
  ),
  'order.chargeback': STRIPE_CHARGEBACK_REASONS,
  'report.created': Object.fromEntries(
    REPORT_REASONS.map((r) => [r.value, r.label])
  ),
}

const SYSTEM_REASON_LABELS: Record<string, string> = {
  checkout_expired: 'Checkout expired',
  period_ended: 'Subscription period ended',
  no_bids: 'No bids placed',
  reserve_not_met: 'Reserve not met',
  no_winning_bid: 'No winning bid',
  deauthorized: 'Stripe access revoked',
}

const REPORT_ACTION_LABELS: Record<string, string> = {
  dismiss: 'Dismissed',
  warn: 'Seller warned',
  remove: 'Listing removed',
  suspend: 'Suspended as seller',
  ban: 'Account banned',
}

function resolveReason(
  action: string,
  raw: string | undefined
): string | null {
  if (!raw) return null
  const map = REASON_LABELS[action]
  if (map && map[raw]) return map[raw]
  if (SYSTEM_REASON_LABELS[raw]) return SYSTEM_REASON_LABELS[raw]
  return raw
}

const ACTION_LABELS: Record<string, string> = {
  'order.created': 'Order placed',
  'order.paid': 'Payment received',
  'order.payment_failed': 'Payment failed',
  'order.shipped': 'Shipped',
  'order.completed': 'Completed',
  'order.refunded': 'Refunded',
  'order.cancelled': 'Cancelled',
  'order.chargeback': 'Chargeback received',
  'order.chargeback_won': 'Chargeback dismissed',
  'order.chargeback_lost': 'Chargeback upheld',
  'dispute.opened': 'Refund requested',
  'dispute.responded': 'Seller responded',
  'dispute.resolved_buyer': 'Refund approved',
  'dispute.resolved_seller': 'Refund declined',
  'listing.created': 'Listing created',
  'listing.updated': 'Listing edited',
  'listing.deleted': 'Listing deleted',
  'listing.published': 'Listing published',
  'listing.relisted': 'Relisted',
  'listing.expired': 'Expired',
  'listing.removed': 'Removed',
  'listing.approved': 'Approved by staff',
  'listing.rejected': 'Rejected by staff',
  'listing.warning': 'Warning issued',
  'listing.appeal_submitted': 'Appeal submitted',
  'listing.appeal_decided': 'Appeal decided',
  'auction.created': 'Auction created',
  'auction.opened': 'Auction opened',
  'auction.bid_placed': 'Bid placed',
  'auction.ended_sold': 'Auction sold',
  'auction.ended_unsold': 'Auction ended unsold',
  'auction.payment_overdue': 'Auction payment overdue',
  'subscription.created': 'Subscription created',
  'subscription.activated': 'Subscription activated',
  'subscription.cancel_scheduled': 'Cancellation scheduled',
  'subscription.cancelled': 'Cancelled',
  'subscription.paused': 'Paused',
  'subscription.resumed': 'Resumed',
  'subscription.reactivated': 'Reactivated',
  'subscription.past_due': 'Payment past due',
  'subscription.chargeback': 'Chargeback received',
  'subscription.chargeback_won': 'Chargeback dismissed',
  'subscription.chargeback_lost': 'Chargeback upheld',
  'review.created': 'Review submitted',
  'review.responded': 'Response posted',
  'review.revealed': 'Review revealed',
  'review.hide': 'Review hidden',
  'review.remove': 'Review removed',
  'review.restore': 'Review restored',
  'report.created': 'Reported',
  'report.actioned': 'Report actioned',
  'account.seller_activated': 'Seller activated',
  'account.stripe_connected': 'Stripe connected',
  'account.stripe_onboarded': 'Stripe onboarded',
  'account.stripe_restricted': 'Stripe restricted',
  'account.stripe_disconnected': 'Stripe disconnected',
  'account.suspended': 'Suspended as seller',
  'account.unsuspended': 'Unsuspended',
  'account.banned': 'Banned',
  'account.unbanned': 'Unbanned',
}

interface AuditTimelineProps {
  kind: string
  object: string | number
  title?: string
}

export function AuditTimeline({
  kind,
  object,
  title = 'History',
}: AuditTimelineProps) {
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    auditApi
      .object({ kind, object: String(object), limit: 100 })
      .then((r) => {
        if (!cancelled) setEntries(r.audit)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load history'))
      })
    return () => {
      cancelled = true
    }
  }, [kind, object])

  if (error) return null
  if (!entries || entries.length === 0) return null

  return (
    <Card className='rounded-lg'>
      <CardContent className='p-4 space-y-3'>
        <h3 className='font-medium'>{title}</h3>
        <ol className='space-y-3'>
          {entries.map((entry) => {
            const label = ACTION_LABELS[entry.action] ?? entry.action
            const data = parseData(entry.data)
            const detail = formatDetail(entry.action, data, formatPrice)
            const actor =
              entry.actor === 'system'
                ? 'System'
                : entry.actor_name || formatFingerprint(entry.actor)
            return (
              <li
                key={entry.id}
                className='border-l-2 border-muted pl-3 space-y-0.5'
              >
                <p className='text-sm'>
                  <span className='font-medium'>{label}</span>
                  {detail && <span>: {detail}</span>}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {formatTimestamp(entry.timestamp)} · {actor}
                </p>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}

function parseData(data: string): Record<string, unknown> | null {
  if (!data) return null
  try {
    return JSON.parse(data) as Record<string, unknown>
  } catch {
    return null
  }
}

function formatDetail(
  action: string,
  data: Record<string, unknown> | null,
  formatPrice: (amount: number, currency: string) => string
): string | null {
  if (!data) return null
  const bits: string[] = []
  const resolvedReason = resolveReason(
    action,
    typeof data.reason === 'string' ? data.reason : undefined
  )
  if (resolvedReason) bits.push(resolvedReason)
  if (
    typeof data.amount === 'number' &&
    typeof data.currency === 'string' &&
    data.currency
  ) {
    bits.push(formatPrice(data.amount, data.currency))
  }
  if (
    typeof data.refund_amount === 'number' &&
    typeof data.currency === 'string' &&
    data.currency
  ) {
    let amountStr = formatPrice(data.refund_amount, data.currency)
    if (data.partial === true && typeof data.total === 'number') {
      amountStr += ` of ${formatPrice(data.total, data.currency)}`
    }
    bits.push(amountStr)
  }
  if (typeof data.notes === 'string' && data.notes) bits.push(data.notes)
  if (typeof data.description === 'string' && data.description)
    bits.push(data.description)
  if (typeof data.carrier === 'string' && data.carrier) {
    const tracking =
      typeof data.tracking === 'string' && data.tracking
        ? `: ${data.tracking}`
        : ''
    bits.push(`${data.carrier}${tracking}`)
  }
  if (typeof data.action === 'string' && data.action) {
    const label =
      action === 'report.actioned'
        ? REPORT_ACTION_LABELS[data.action] ?? data.action
        : data.action
    bits.push(label)
  }
  if (typeof data.decision === 'string' && data.decision)
    bits.push(data.decision === 'upheld' ? 'Appeal upheld' : 'Appeal denied')
  if (typeof data.moderation === 'string' && data.moderation)
    bits.push(`moderation: ${data.moderation}`)
  return bits.length > 0 ? bits.join(' — ') : null
}
