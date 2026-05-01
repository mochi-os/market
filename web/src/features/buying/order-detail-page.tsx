import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link, useLoaderData, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { Download, ExternalLink, LoaderCircle, MessageCircle, Package, Star } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  GeneralError,
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
  usePageTitle,
  getAppPath,
  getErrorMessage,
  shellNavigateTop,
  useFormat,
} from '@mochi/web'
import { assetsApi } from '@/api/assets'
import { ordersApi } from '@/api/orders'
import { reviewsApi } from '@/api/reviews'
import { useFormatPrice, formatFingerprint } from '@/lib/format'
import { DISPUTE_REASONS, STRIPE_CHARGEBACK_REASONS } from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'
import { AuditTimeline } from '@/components/shared/audit-timeline'
import { StatusBadge } from '@/components/shared/status-badge'
import { MessageSheet } from '@/features/listing/message-sheet'

export function OrderDetailPage() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle(t`Order`)
  const { data, error } = useLoaderData({
    from: '/_authenticated/purchases_/$orderId',
  })
  const navigate = useNavigate()
  const router = useRouter()
  const search = useSearch({ strict: false }) as { thread?: number }
  const [loading, setLoading] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('other')
  const [refundDesc, setRefundDesc] = useState('')
  const [downloading, setDownloading] = useState<Set<number>>(new Set())
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewText, setReviewText] = useState('')
  const [messageOpen, setMessageOpen] = useState(!!search.thread)

  if (error) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title={t`Order`} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title={t`Order`} />
        <Main>
          <EmptyState icon={Package} title={t`Order not found`} />
        </Main>
      </>
    )
  }

  const {
    order,
    listing,
    assets,
    dispute,
    review,
    peer_review: peerReview,
    can_review: canReview,
  } = data

  async function handleConfirmDelivery() {
    setLoading(true)
    try {
      await ordersApi.confirm(order.id)
      toast.success(t`Receipt confirmed`)
      await router.invalidate()
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to confirm`))
    } finally {
      setLoading(false)
    }
  }

  async function handleResumePayment() {
    setLoading(true)
    try {
      const base = window.location.origin + getAppPath()
      const result = await ordersApi.resume({
        id: order.id,
        success_url: `${base}/purchases/${order.id}`,
        cancel_url: `${base}/purchases/${order.id}`,
      })
      if (result.checkout_url) {
        shellNavigateTop(result.checkout_url)
      } else {
        toast.error(t`Could not start payment`)
        setLoading(false)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to resume payment`))
      setLoading(false)
    }
  }

  async function handleRefund() {
    setLoading(true)
    try {
      await ordersApi.dispute({
        id: order.id,
        reason: refundReason,
        description: refundDesc,
      })
      toast.success(t`Refund requested`)
      setRefundOpen(false)
      await router.invalidate()
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to request refund`))
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

  return (
    <>
      <PageHeader
        icon={<Package className='size-4 md:size-5' />}
        title={listing?.title || `Order #${order.id}`}
        back={{ label: t`Purchases`, onFallback: () => navigate({ to: APP_ROUTES.PURCHASES }) }}
      />
      <Main>
        <div className='max-w-2xl space-y-4'>
          {/* Digital assets download — shown first and prominently */}
          {assets.length > 0 && (
            <Card className='rounded-lg border-2'>
              <CardContent className='p-5 space-y-3'>
                <div className='space-y-1'>
                  <h3 className='text-lg font-semibold'><Trans>Your purchase is ready</Trans></h3>
                  <p className='text-sm text-muted-foreground'>
                    {assets.length === 1
                      ? 'Download your file below.'
                      : `Download your ${assets.length} files below.`}
                  </p>
                </div>
                <div className='space-y-2'>
                  {assets.map((asset) => {
                    const isDownloading = downloading.has(asset.id)
                    return (
                      <Button
                        key={asset.id}
                        variant='outline'
                        className='w-full justify-between h-auto py-3'
                        disabled={isDownloading}
                        onClick={async () => {
                          setDownloading((prev) => new Set(prev).add(asset.id))
                          try {
                            await assetsApi.download(asset.id, asset.filename, asset.hosting)
                          } catch (err) {
                            toast.error(getErrorMessage(err, t`Failed to download`))
                          } finally {
                            setDownloading((prev) => {
                              const next = new Set(prev)
                              next.delete(asset.id)
                              return next
                            })
                          }
                        }}
                      >
                        <span className='truncate'>{asset.filename}</span>
                        {isDownloading ? (
                          <LoaderCircle className='size-4 shrink-0 ms-2 animate-spin' />
                        ) : asset.hosting === 'external' ? (
                          <ExternalLink className='size-4 shrink-0 ms-2' />
                        ) : (
                          <Download className='size-4 shrink-0 ms-2' />
                        )}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className='rounded-lg'>
            <CardContent className='p-4 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Status</Trans></span>
                <StatusBadge status={order.status} />
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Seller</Trans></span>
                <Link
                  to={APP_ROUTES.PROFILE(order.seller)}
                  className='text-sm underline hover:text-foreground'
                >
                  {order.seller_name || formatFingerprint(order.seller)}
                </Link>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'><Trans>Total</Trans></span>
                <span className='font-medium'>
                  {formatPrice(order.total, order.currency)}
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

          {dispute && (() => {
            const isChargeback = dispute.opener === 'stripe'
            const chargebackLabel = isChargeback
              ? `Chargeback ${(STRIPE_CHARGEBACK_REASONS[dispute.reason] ?? dispute.reason.replace(/_/g, ' ')).toLowerCase()}`
              : null
            return (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-medium'>
                    {isChargeback ? chargebackLabel : 'Refund request'}
                  </h3>
                  <StatusBadge status={dispute.status} />
                </div>
                {!isChargeback && (
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'><Trans>Reason</Trans></span>
                    <span className='text-sm'>
                      {DISPUTE_REASONS.find((r) => r.value === dispute.reason)
                        ?.label ?? dispute.reason}
                    </span>
                  </div>
                )}
                {dispute.status === 'resolved_buyer' &&
                  dispute.refund_amount > 0 && (
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-muted-foreground'>
                        {dispute.refund_amount < order.total
                          ? 'Refunded (partial)'
                          : 'Refunded'}
                      </span>
                      <span className='text-sm'>
                        {formatPrice(dispute.refund_amount, order.currency)}
                        {dispute.refund_amount < order.total && (
                          <span className='text-muted-foreground'>
                            {' '}of {formatPrice(order.total, order.currency)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                {isChargeback && (
                  <p className='text-sm text-muted-foreground'>
                    Your bank filed a chargeback on this order. Stripe is
                    handling the dispute with the seller; the outcome will
                    appear here when it's decided.
                  </p>
                )}
                {!isChargeback && dispute.description && (
                  <div>
                    <div className='text-sm text-muted-foreground'><Trans>Your details</Trans></div>
                    <div className='text-sm whitespace-pre-wrap'>
                      {dispute.description}
                    </div>
                  </div>
                )}
                {!isChargeback && dispute.response && (
                  <div>
                    <div className='text-sm text-muted-foreground'>
                      <Trans>Seller's response</Trans>
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
              </CardContent>
            </Card>
            )
          })()}

          {/* Actions */}
          <div className='flex flex-wrap gap-2'>
            {order.status === 'pending' && (
              <Button onClick={handleResumePayment} disabled={loading}>
                <Trans>Continue payment</Trans>
              </Button>
            )}
            {(order.status === 'shipped' ||
              order.status === 'delivered' ||
              (order.status === 'paid' && order.delivery === 'pickup')) && (
              <Button onClick={handleConfirmDelivery} disabled={loading}>
                <Trans>Confirm receipt</Trans>
              </Button>
            )}
            {listing && listing.status === 'active' && (
              <Link to={APP_ROUTES.LISTINGS.VIEW(listing.id)}>
                <Button variant='outline'><Trans>Buy again</Trans></Button>
              </Link>
            )}
            {order.status !== 'pending' &&
              order.status !== 'refunded' &&
              order.status !== 'cancelled' &&
              order.status !== 'disputed' &&
              order.refunded < order.total && (
                <Button
                  variant='outline'
                  onClick={() => setRefundOpen(true)}
                >
                  <Trans>Request refund</Trans>
                </Button>
              )}
            {listing && (
              <Button variant='outline' onClick={() => setMessageOpen(true)}>
                <MessageCircle className='me-1 size-4' />
                <Trans>Message seller</Trans>
              </Button>
            )}
          </div>

          {/* Review */}
          {order.status === 'completed' && review && (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-medium'><Trans>Your review</Trans></h3>
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
                    <Trans>Hidden until the seller reviews you, or after 14 days.</Trans>
                  </p>
                )}
                {review.response && (
                  <div className='border-s-2 ps-3 space-y-1'>
                    <div className='text-xs text-muted-foreground'>
                      <Trans>Seller's response</Trans>
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
                    Review from{' '}
                    <Link
                      to={APP_ROUTES.PROFILE(order.seller)}
                      className='underline hover:text-foreground'
                    >
                      {peerReview.reviewer_name || formatFingerprint(peerReview.reviewer)}
                    </Link>
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
                <h3 className='font-medium'><Trans>Leave a review</Trans></h3>
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
          open={refundOpen}
          onOpenChange={setRefundOpen}
          title={t`Request refund`}
          desc='Provide a reason for your refund request.'
          handleConfirm={handleRefund}
          confirmText='Request refund'
          isLoading={loading}
        >
          <div className='space-y-3'>
            <div>
              <Label><Trans>Reason</Trans></Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor='refundDesc'><Trans>Details</Trans></Label>
              <Textarea
                id='refundDesc'
                value={refundDesc}
                onChange={(e) => setRefundDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ConfirmDialog>
      </Main>
      {listing && (
        <MessageSheet
          listingId={listing.id}
          listingTitle={listing.title}
          threadId={search.thread}
          open={messageOpen}
          onOpenChange={setMessageOpen}
        />
      )}
    </>
  )
}
