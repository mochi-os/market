import { useLingui } from '@lingui/react/macro'
import {
  useDisputeReasons,
  useReportReasons,
  useStripeChargebackReasons,
} from '@/config/constants'

export function useActionLabels(): Record<string, string> {
  const { t } = useLingui()
  return {
    'order.created': t`Order placed`,
    'order.paid': t`Payment received`,
    'order.payment_failed': t`Payment failed`,
    'order.shipped': t`Shipped`,
    'order.completed': t`Completed`,
    'order.refunded': t`Refunded`,
    'order.cancelled': t`Cancelled`,
    'order.chargeback': t`Chargeback received`,
    'order.chargeback_won': t`Chargeback dismissed`,
    'order.chargeback_lost': t`Chargeback upheld`,
    'dispute.opened': t`Refund requested`,
    'dispute.responded': t`Seller responded`,
    'dispute.resolved_buyer': t`Refund approved`,
    'dispute.resolved_seller': t`Refund declined`,
    'listing.created': t`Listing created`,
    'listing.updated': t`Listing edited`,
    'listing.deleted': t`Listing deleted`,
    'listing.published': t`Listing published`,
    'listing.relisted': t`Relisted`,
    'listing.expired': t`Expired`,
    'listing.removed': t`Removed`,
    'listing.approved': t`Approved by staff`,
    'listing.rejected': t`Rejected by staff`,
    'listing.warning': t`Warning issued`,
    'listing.appeal_submitted': t`Appeal submitted`,
    'listing.appeal_decided': t`Appeal decided`,
    'auction.created': t`Auction created`,
    'auction.opened': t`Auction opened`,
    'auction.bid_placed': t`Bid placed`,
    'auction.ended_sold': t`Auction sold`,
    'auction.ended_unsold': t`Auction ended unsold`,
    'auction.payment_overdue': t`Auction payment overdue`,
    'subscription.created': t`Subscription created`,
    'subscription.activated': t`Subscription activated`,
    'subscription.cancel_scheduled': t`Cancellation scheduled`,
    'subscription.cancelled': t`Cancelled`,
    'subscription.paused': t`Paused`,
    'subscription.resumed': t`Resumed`,
    'subscription.reactivated': t`Reactivated`,
    'subscription.past_due': t`Payment past due`,
    'subscription.chargeback': t`Chargeback received`,
    'subscription.chargeback_won': t`Chargeback dismissed`,
    'subscription.chargeback_lost': t`Chargeback upheld`,
    'review.created': t`Review submitted`,
    'review.responded': t`Response posted`,
    'review.revealed': t`Review revealed`,
    'review.hide': t`Review hidden`,
    'review.remove': t`Review removed`,
    'review.restore': t`Review restored`,
    'report.created': t`Reported`,
    'report.actioned': t`Report actioned`,
    'account.seller_activated': t`Seller activated`,
    'account.stripe_connected': t`Stripe connected`,
    'account.stripe_onboarded': t`Stripe onboarded`,
    'account.stripe_restricted': t`Stripe restricted`,
    'account.stripe_disconnected': t`Stripe disconnected`,
    'account.suspended': t`Suspended as seller`,
    'account.unsuspended': t`Unsuspended`,
    'account.banned': t`Banned`,
    'account.unbanned': t`Unbanned`,
  }
}

export function useReportActionLabels(): Record<string, string> {
  const { t } = useLingui()
  return {
    dismiss: t`Dismissed`,
    warn: t`Seller warned`,
    remove: t`Listing removed`,
    suspend: t`Suspended as seller`,
    ban: t`Account banned`,
  }
}

export function useResolveReason() {
  const { t } = useLingui()
  const disputeReasons = useDisputeReasons()
  const reportReasons = useReportReasons()
  const stripeReasons = useStripeChargebackReasons()

  const REASON_LABELS: Record<string, Record<string, string>> = {
    'dispute.opened': Object.fromEntries(
      disputeReasons.map((r) => [r.value, r.label])
    ),
    'order.refund_requested': Object.fromEntries(
      disputeReasons.map((r) => [r.value, r.label])
    ),
    'order.chargeback': stripeReasons,
    'report.created': Object.fromEntries(
      reportReasons.map((r) => [r.value, r.label])
    ),
  }

  const SYSTEM_REASON_LABELS: Record<string, string> = {
    checkout_expired: t`Checkout expired`,
    period_ended: t`Subscription period ended`,
    no_bids: t`No bids placed`,
    reserve_not_met: t`Reserve not met`,
    no_winning_bid: t`No winning bid`,
    deauthorized: t`Stripe access revoked`,
  }

  return function resolveReason(
    action: string,
    raw: string | undefined
  ): string | null {
    if (!raw) return null
    const map = REASON_LABELS[action]
    if (map && map[raw]) return map[raw]
    if (SYSTEM_REASON_LABELS[raw]) return SYSTEM_REASON_LABELS[raw]
    return raw
  }
}
