import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link, useLoaderData, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { MessageCircle, Package, Star, Truck } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  GeneralError,
  Input,
  Label,
  Main,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
  getErrorMessage,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import { disputesApi } from '@/api/disputes'
import { ordersApi } from '@/api/orders'
import { reviewsApi } from '@/api/reviews'
import { useFormatPrice, formatFingerprint, currencyDecimals, toMinorUnits, fromMinorUnits } from '@/lib/format'
import { useDisputeReasons, useStripeChargebackReasons } from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'
import { AuditTimeline } from '@/components/shared/audit-timeline'
import { StatusBadge } from '@/components/shared/status-badge'
import { MessageSheet } from '@/features/listing/message-sheet'

export function SaleDetailPage() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  const DISPUTE_REASONS = useDisputeReasons()
  const STRIPE_CHARGEBACK_REASONS = useStripeChargebackReasons()
  usePageTitle(t`Sale`)
  const { data, error } = useLoaderData({
    from: '/_authenticated/sales_/$orderId',
  })
  const navigate = useNavigate()
  const router = useRouter()
  const search = useSearch({ strict: false }) as { thread?: number }
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [respondOpen, setRespondOpen] = useState(false)
  const [respondBody, setRespondBody] = useState('')
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewText, setReviewText] = useState('')
  const [messageOpen, setMessageOpen] = useState(!!search.thread)

  if (error) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title={t`Sale`} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title={t`Sale`} />
        <Main>
          <EmptyState icon={Package} title={t`Order not found`} />
        </Main>
      </>
    )
  }

  const {
    order,
    listing,
    dispute,
    review,
    peer_review: peerReview,
    can_review: canReview,
  } = data

  async function handleRespond() {
    setLoading(true)
    try {
      await disputesApi.respond({ id: dispute!.id, body: respondBody })
      toast.success(t`Response submitted`)
      setRespondOpen(false)
      await router.invalidate()
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to submit response`))
    } finally {
      setLoading(false)
    }
  }

  async function handleReview() {
    setLoading(true)
    try {
      await reviewsApi.create({
        order: order.id,
        rating: Number(reviewRating),
        text: reviewText,
      })
      toast.success(t`Review submitted`)
      setReviewText('')
      await router.invalidate()
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to submit review`))
    } finally {
      setLoading(false)
    }
  }

  function parseRefundAmount(value: string, max: number): number | null {
    const trimmed = value.trim()
    if (!trimmed) return max
    const num = Number(trimmed)
    if (!Number.isFinite(num) || num <= 0) return null
    const cents = toMinorUnits(num, order.currency)
    if (cents <= 0 || cents > max) return null
    return cents
  }

  async function handleRefund() {
    setLoading(true)
    try {
      const remaining = order.total - (order.refunded ?? 0)
      const parsed = parseRefundAmount(refundAmount, remaining)
      if (parsed === null) {
        toast.error(t`Enter an amount between 0.01 and the remaining total`)
        setLoading(false)
        return
      }
      await ordersApi.refund({
        id: order.id,
        amount: parsed === remaining ? 0 : parsed,
      })
      toast.success(parsed >= remaining ? t`Refund issued` : t`Partial refund issued`)
      setRefundOpen(false)
      await router.invalidate()
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to issue refund`))
    } finally {
      setLoading(false)
    }
  }

  async function handleShip() {
    setLoading(true)
    try {
      await ordersApi.ship({
        id: order.id,
        carrier,
        tracking,
        url: trackingUrl,
      })
      toast.success(t`Marked as shipped`)
      await router.invalidate()
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to mark as shipped`))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        icon={<Package className='size-4 md:size-5' />}
        title={listing?.title || t`Sale #${order.id}`}
        back={{ label: t`Sales`, onFallback: () => navigate({ to: APP_ROUTES.SALES }) }}
      />
      <Main>
        <div className='max-w-2xl space-y-4'>
          <Card className='rounded-lg'>
            <CardContent className='p-4 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Status</Trans></span>
                <StatusBadge status={order.status} />
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Buyer</Trans></span>
                <Link
                  to={APP_ROUTES.PROFILE(order.buyer)}
                  className='text-sm underline hover:text-foreground'
                >
                  {order.buyer_name || formatFingerprint(order.buyer)}
                </Link>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Total</Trans></span>
                <span className='font-medium'>
                  {formatPrice(order.total, order.currency)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Your payout</Trans></span>
                <span className='font-medium'>
                  {formatPrice(order.payout, order.currency)}
                </span>
              </div>
              {order.refunded > 0 && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'><Trans>Refunded</Trans></span>
                  <span className='font-medium'>
                    {formatPrice(order.refunded, order.currency)}
                    {order.refunded < order.total && (
                      <span className='text-muted-foreground'>
                        {' '}of {formatPrice(order.total, order.currency)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Delivery</Trans></span>
                <span className='text-sm capitalize'>{order.delivery}</span>
              </div>
              {order.carrier && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>
                    <Trans>Tracking</Trans>
                  </span>
                  <span className='text-sm'>
                    {order.carrier}
                    {order.tracking &&
                      (order.url ? (
                        <>
                          :{' '}
                          <a
                            href={order.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='underline'
                          >
                            {order.tracking}
                          </a>
                        </>
                      ) : (
                        `: ${order.tracking}`
                      ))}
                  </span>
                </div>
              )}
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Purchased</Trans></span>
                <span className='text-sm'>
                  {formatTimestamp(order.created)}
                </span>
              </div>
            </CardContent>
          </Card>

          {listing && (
            <div className='flex flex-wrap gap-2'>
              <Button variant='outline' onClick={() => setMessageOpen(true)}>
                <MessageCircle className='me-1 size-4' />
                <Trans>Message buyer</Trans>
              </Button>
            </div>
          )}

          {dispute && (() => {
            const isChargeback = dispute.opener === 'stripe'
            const chargebackReasonText = (STRIPE_CHARGEBACK_REASONS[dispute.reason] ?? dispute.reason.replace(/_/g, ' ')).toLowerCase()
            const reasonLabel = isChargeback
              ? t`Chargeback ${chargebackReasonText}`
              : DISPUTE_REASONS.find((r) => r.value === dispute.reason)?.label ?? dispute.reason
            return (
              <Card className='rounded-lg'>
                <CardContent className='p-4 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h3 className='font-medium'>
                      {isChargeback ? reasonLabel : t`Refund request`}
                    </h3>
                    <StatusBadge status={dispute.status} />
                  </div>
                  {!isChargeback && (
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-muted-foreground'><Trans>Reason</Trans></span>
                      <span className='text-sm'>{reasonLabel}</span>
                    </div>
                  )}
                  {!isChargeback &&
                    dispute.status === 'resolved_buyer' &&
                    dispute.refund_amount > 0 && (
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          {dispute.refund_amount < order.total
                            ? t`Refunded (partial)`
                            : t`Refunded`}
                        </span>
                        <span className='text-sm'>
                          {formatPrice(dispute.refund_amount, order.currency)}
                          {dispute.refund_amount < order.total && (
                            <span className='text-muted-foreground'>
                              {' '}<Trans>of {formatPrice(order.total, order.currency)}</Trans>
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  {isChargeback && dispute.fee > 0 && (
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-muted-foreground'>
                        <Trans>Chargeback fee</Trans>
                      </span>
                      <span className='text-sm'>
                        {formatPrice(dispute.fee, order.currency)}
                        {dispute.fee_refunded >= dispute.fee && dispute.fee_refunded > 0 && (
                          <span className='text-muted-foreground'> <Trans>(refunded)</Trans></span>
                        )}
                        {dispute.fee_refunded > 0 &&
                          dispute.fee_refunded < dispute.fee && (
                            <span className='text-muted-foreground'>
                              {' '}
                              <Trans>({formatPrice(dispute.fee_refunded, order.currency)} refunded)</Trans>
                            </span>
                          )}
                        {dispute.status === 'resolved_buyer' &&
                          dispute.fee_refunded === 0 && (
                            <span className='text-muted-foreground'> <Trans>(kept by Stripe)</Trans></span>
                          )}
                      </span>
                    </div>
                  )}
                  {isChargeback &&
                    dispute.status === 'open' &&
                    dispute.evidence_due > 0 && (
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          <Trans>Evidence due by</Trans>
                        </span>
                        <span className='text-sm'>
                          {formatTimestamp(dispute.evidence_due)}
                        </span>
                      </div>
                    )}
                  {isChargeback && (
                    <p className='text-sm text-muted-foreground'>
                      <Trans>
                        Submit evidence on Stripe Dashboard. Stripe debited
                        the disputed amount and any chargeback fee from your
                        Connect balance until resolution.
                      </Trans>
                    </p>
                  )}
                  {!isChargeback && dispute.description && (
                    <div>
                      <div className='text-sm text-muted-foreground'><Trans>Buyer's details</Trans></div>
                      <div className='text-sm whitespace-pre-wrap'>
                        {dispute.description}
                      </div>
                    </div>
                  )}
                  {!isChargeback && dispute.response && (
                    <div>
                      <div className='text-sm text-muted-foreground'>
                        <Trans>Your response</Trans>
                      </div>
                      <div className='text-sm whitespace-pre-wrap'>
                        {dispute.response}
                      </div>
                    </div>
                  )}
                  {dispute.resolution && (
                    <div>
                      <div className='text-sm text-muted-foreground'>
                        {isChargeback ? t`Outcome` : t`Staff resolution`}
                      </div>
                      <div className='text-sm whitespace-pre-wrap'>
                        {dispute.resolution}
                      </div>
                    </div>
                  )}
                  {!isChargeback && dispute.status === 'open' && (
                    <Button onClick={() => setRespondOpen(true)}>
                      <Trans>Respond</Trans>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })()}

          {(() => {
            const remaining = order.total - (order.refunded ?? 0)
            const chargebackOpen =
              dispute && dispute.opener === 'stripe' && dispute.status === 'open'
            const canRefund =
              !!order.stripe &&
              !['refunded', 'cancelled'].includes(order.status) &&
              remaining > 0 &&
              !chargebackOpen
            if (!canRefund) return null
            return (
              <Card className='rounded-lg'>
                <CardContent className='p-4 space-y-3'>
                  <h3 className='font-medium'><Trans>Issue refund</Trans></h3>
                  <p className='text-sm text-muted-foreground'>
                    <Trans>
                      Refund {formatPrice(remaining, order.currency)} or a
                      smaller amount to the buyer. Mochi's 5% fee is returned
                      proportionally.
                    </Trans>
                    {dispute && dispute.status === 'open' && dispute.opener !== 'stripe' &&
                      ' ' + t`This will resolve the open dispute.`}
                  </p>
                  <Button onClick={() => setRefundOpen(true)} disabled={loading}>
                    <Trans>Issue refund</Trans>
                  </Button>
                </CardContent>
              </Card>
            )
          })()}

          {order.status === 'paid' && order.delivery === 'shipping' && (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-3'>
                <h3 className='font-medium'><Trans>Ship order</Trans></h3>
                <div>
                  <Label htmlFor='carrier'><Trans>Carrier</Trans></Label>
                  <Input
                    id='carrier'
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='tracking'><Trans>Tracking number</Trans></Label>
                  <Input
                    id='tracking'
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='trackingUrl'><Trans>Tracking URL</Trans></Label>
                  <Input
                    id='trackingUrl'
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                  />
                </div>
                <Button onClick={handleShip} disabled={loading}>
                  <Truck className='me-1 size-4' />
                  {loading ? t`Shipping...` : t`Mark as shipped`}
                </Button>
              </CardContent>
            </Card>
          )}

          {order.delivery === 'shipping' && order.address_name && (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-1'>
                <h3 className='font-medium'><Trans>Shipping address</Trans></h3>
                <p className='text-sm'>{order.address_name}</p>
                <p className='text-sm'>{order.address_line1}</p>
                {order.address_line2 && (
                  <p className='text-sm'>{order.address_line2}</p>
                )}
                <p className='text-sm'>
                  {order.address_city}
                  {order.address_region && `, ${order.address_region}`}
                </p>
                <p className='text-sm'>{order.address_postcode}</p>
                <p className='text-sm'>{order.address_country}</p>
              </CardContent>
            </Card>
          )}

          {order.status === 'completed' && review && (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-medium'><Trans>Your review of the buyer</Trans></h3>
                  <div className='flex'>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${
                          i < review.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {review.text && (
                  <p className='text-sm whitespace-pre-wrap'>{review.text}</p>
                )}
                {!review.visible && (
                  <p className='text-xs text-muted-foreground italic'>
                    <Trans>Hidden until the buyer reviews you, or after 14 days.</Trans>
                  </p>
                )}
                {review.response && (
                  <div className='border-s-2 ps-3 space-y-1'>
                    <div className='text-xs text-muted-foreground'>
                      <Trans>Buyer's response</Trans>
                    </div>
                    <p className='text-sm whitespace-pre-wrap'>
                      {review.response}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.status === 'completed' && peerReview && (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-medium'>
                    <Trans>
                      Review from{' '}
                      <Link
                        to={APP_ROUTES.PROFILE(order.buyer)}
                        className='underline hover:text-foreground'
                      >
                        {peerReview.reviewer_name || formatFingerprint(peerReview.reviewer)}
                      </Link>
                    </Trans>
                  </h3>
                  <div className='flex'>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${
                          i < peerReview.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {peerReview.text && (
                  <p className='text-sm whitespace-pre-wrap'>
                    {peerReview.text}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {canReview && (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-3'>
                <h3 className='font-medium'><Trans>Leave a review of the buyer</Trans></h3>
                <div>
                  <Label><Trans>Rating</Trans></Label>
                  <Select
                    value={reviewRating}
                    onValueChange={setReviewRating}
                  >
                    <SelectTrigger className='w-24'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} star{n !== 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor='reviewText'><Trans>Review</Trans></Label>
                  <Textarea
                    id='reviewText'
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleReview} disabled={loading}>
                  <Trans>Submit review</Trans>
                </Button>
              </CardContent>
            </Card>
          )}

          <AuditTimeline kind='order' object={order.id} />
        </div>

        <ConfirmDialog
          open={respondOpen}
          onOpenChange={setRespondOpen}
          title={t`Respond to refund request`}
          desc=''
          handleConfirm={handleRespond}
          confirmText={t`Submit response`}
          isLoading={loading}
          disabled={!respondBody.trim()}
        >
          <div>
            <Label htmlFor='respondBody'><Trans>Your response</Trans></Label>
            <Textarea
              id='respondBody'
              value={respondBody}
              onChange={(e) => setRespondBody(e.target.value)}
              rows={4}
            />
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={refundOpen}
          onOpenChange={(open) => {
            setRefundOpen(open)
            if (!open) setRefundAmount('')
          }}
          title={t`Issue refund`}
          desc=''
          handleConfirm={handleRefund}
          confirmText={t`Issue refund`}
          isLoading={loading}
        >
          <div>
            <Label htmlFor='refundAmount'>
              <Trans>Amount ({order.currency.toUpperCase()})</Trans>
            </Label>
            <Input
              id='refundAmount'
              type='number'
              step='0.01'
              min='0'
              placeholder={fromMinorUnits(
                order.total - (order.refunded ?? 0),
                order.currency,
              ).toFixed(currencyDecimals(order.currency))}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
            <p className='mt-1 text-xs text-muted-foreground'>
              <Trans>
                Leave blank to refund the full remaining{' '}
                {formatPrice(
                  order.total - (order.refunded ?? 0),
                  order.currency,
                )}
                .
              </Trans>
            </p>
          </div>
        </ConfirmDialog>
      </Main>
      {listing && (
        <MessageSheet
          listingId={listing.id}
          listingTitle={listing.title}
          threadId={search.thread}
          buyer={order.buyer}
          open={messageOpen}
          onOpenChange={setMessageOpen}
        />
      )}
    </>
  )
}
