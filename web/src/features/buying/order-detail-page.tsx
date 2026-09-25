// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useState } from 'react'
import {
  Link,
  useLoaderData,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import {
  useDeliveryMethods,
  useDisputeReasons,
  useStripeChargebackReasons,
} from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'
import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  CopyButton,
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
  getErrorMessage,
  useFormat,
} from '@mochi/web'
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  MessageCircle,
  Package,
  Receipt,
  ShoppingBag,
  Star,
  Truck,
  User,
} from 'lucide-react'
import { assetsApi } from '@/api/assets'
import { ordersApi } from '@/api/orders'
import { reviewsApi } from '@/api/reviews'
import { useFormatPrice, formatFingerprint } from '@/lib/format'
import { AuditTimeline } from '@/components/shared/audit-timeline'
import { StatusBadge } from '@/components/shared/status-badge'
import { MessageSheet } from '@/features/listing/message-sheet'

export function OrderDetailPage() {
  const { t } = useLingui()
  const DELIVERY_METHODS = useDeliveryMethods()
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  const DISPUTE_REASONS = useDisputeReasons()
  const STRIPE_CHARGEBACK_REASONS = useStripeChargebackReasons()
  usePageTitle(t`Order`)
  const { data, error } = useLoaderData({
    from: '/_authenticated/purchases_/$orderId',
  })
  const navigate = useNavigate()
  const router = useRouter()
  const search = useSearch({ strict: false }) as { thread?: string }
  const [loading, setLoading] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('other')
  const [refundDesc, setRefundDesc] = useState('')
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewText, setReviewText] = useState('')
  const [messageOpen, setMessageOpen] = useState(!!search.thread)

  if (error) {
    return (
      <>
        <PageHeader
          icon={<Package className='size-4 md:size-5' />}
          title={t`Order`}
        />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader
          icon={<Package className='size-4 md:size-5' />}
          title={t`Order`}
        />
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

  function handleResumePayment() {
    navigate({ to: APP_ROUTES.CHECKOUT(order.listing) as never })
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

  const showConfirmReceipt =
    order.status === 'shipped' ||
    order.status === 'delivered' ||
    (order.status === 'paid' && order.delivery === 'pickup')
  const canRequestRefund =
    order.status !== 'pending' &&
    order.status !== 'refunded' &&
    order.status !== 'cancelled' &&
    order.status !== 'disputed' &&
    order.refunded < order.total
  const canBuyAgain = !!listing && listing.status === 'active'
  const hasActions =
    order.status === 'pending' ||
    showConfirmReceipt ||
    canBuyAgain ||
    !!listing ||
    canRequestRefund
  const primaryAction =
    order.status === 'pending'
      ? {
          label: t`Continue payment`,
          onClick: handleResumePayment,
          icon: null as React.ReactNode,
        }
      : showConfirmReceipt
        ? {
            label: t`Confirm receipt`,
            onClick: handleConfirmDelivery,
            icon: <CheckCircle2 className='size-4' />,
          }
        : null

  function scrollToReview() {
    document
      .getElementById('order-review')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <PageHeader
        icon={<Package className='size-4 md:size-5' />}
        title={listing?.title || t`Order #${order.id}`}
        back={{
          label: t`Purchases`,
          onFallback: () => navigate({ to: APP_ROUTES.PURCHASES }),
        }}
      />
      <Main>
        {/* Status hero */}
        <OrderStatusHero
          status={order.status}
          delivery={order.delivery}
          hasAssets={assets.length > 0}
        />

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]'>
          <div className='min-w-0 space-y-4 lg:order-1'>
            {/* Review prompt for completed orders */}
            {canReview && (
              <button
                type='button'
                onClick={scrollToReview}
                className='group focus-visible:ring-ring/40 flex w-full items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100 focus-visible:ring-2 focus-visible:outline-none dark:border-amber-800/60 dark:bg-amber-950/40 dark:hover:bg-amber-950/60'
              >
                <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'>
                  <Star className='size-4 fill-current' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-sm font-semibold'>
                    <Trans>Leave a review</Trans>
                  </span>
                  <span className='text-muted-foreground block text-xs'>
                    <Trans>
                      Help future buyers — share how this order went.
                    </Trans>
                  </span>
                </span>
                <span className='text-xs font-medium text-amber-900 group-hover:underline dark:text-amber-200'>
                  <Trans context='write a review'>Review</Trans>
                </span>
              </button>
            )}

            {/* Digital assets download — shown first and prominently */}
            {assets.length > 0 && (
              <Card className='rounded-lg border-2'>
                <CardContent className='space-y-3 p-5'>
                  <div className='space-y-1'>
                    <h3 className='text-lg font-semibold'>
                      <Trans>Your purchase is ready</Trans>
                    </h3>
                    <p className='text-muted-foreground text-sm'>
                      <Plural
                        value={assets.length}
                        one='Download your file below.'
                        other={`Download your ${assets.length} files below.`}
                      />
                    </p>
                  </div>
                  <div className='space-y-2'>
                    {assets.map((asset) => {
                      const isDownloading = downloading.has(asset.id)
                      return (
                        <Button
                          key={asset.id}
                          variant='outline'
                          className='h-auto w-full justify-between py-3'
                          loading={isDownloading}
                          trailingIcon={
                            asset.hosting === 'external' ? (
                              <ExternalLink className='ms-2 size-4 shrink-0' />
                            ) : (
                              <Download className='ms-2 size-4 shrink-0' />
                            )
                          }
                          onClick={async () => {
                            setDownloading((prev) =>
                              new Set(prev).add(asset.id)
                            )
                            try {
                              await assetsApi.download(
                                asset.id,
                                asset.filename,
                                asset.hosting
                              )
                            } catch (err) {
                              toast.error(
                                getErrorMessage(err, t`Failed to download`)
                              )
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
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {dispute &&
              (() => {
                const isChargeback = dispute.opener === 'stripe'
                const chargebackReason =
                  STRIPE_CHARGEBACK_REASONS[dispute.reason] ??
                  dispute.reason.replace(/_/g, ' ')
                const chargebackLabel = isChargeback
                  ? t`Chargeback ${chargebackReason.toLowerCase()}`
                  : null
                return (
                  <Card className='rounded-lg'>
                    <CardContent className='space-y-3 p-4'>
                      <div className='flex items-center justify-between'>
                        <h3 className='font-medium'>
                          {isChargeback ? chargebackLabel : t`Refund request`}
                        </h3>
                        <StatusBadge status={dispute.status} />
                      </div>
                      {!isChargeback && (
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground text-sm'>
                            <Trans>Reason</Trans>
                          </span>
                          <span className='text-sm'>
                            {DISPUTE_REASONS.find(
                              (r) => r.value === dispute.reason
                            )?.label ?? dispute.reason}
                          </span>
                        </div>
                      )}
                      {dispute.status === 'resolved_buyer' &&
                        dispute.refund_amount > 0 && (
                          <div className='flex items-center justify-between'>
                            <span className='text-muted-foreground text-sm'>
                              {dispute.refund_amount < order.total
                                ? t`Refunded (partial)`
                                : t`Refunded`}
                            </span>
                            <span className='text-sm'>
                              {formatPrice(
                                dispute.refund_amount,
                                order.currency
                              )}
                              {dispute.refund_amount < order.total && (
                                <span className='text-muted-foreground'>
                                  {' '}
                                  <Trans>
                                    of{' '}
                                    {formatPrice(order.total, order.currency)}
                                  </Trans>
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      {isChargeback && (
                        <p className='text-muted-foreground text-sm'>
                          <Trans>
                            Your bank filed a chargeback on this order. Stripe
                            is handling the dispute with the seller; the outcome
                            will appear here when it's decided.
                          </Trans>
                        </p>
                      )}
                      {!isChargeback && dispute.description && (
                        <div>
                          <div className='text-muted-foreground text-sm'>
                            <Trans>Your details</Trans>
                          </div>
                          <div className='text-sm whitespace-pre-wrap'>
                            {dispute.description}
                          </div>
                        </div>
                      )}
                      {!isChargeback && dispute.response && (
                        <div>
                          <div className='text-muted-foreground text-sm'>
                            <Trans>Seller's response</Trans>
                          </div>
                          <div className='text-sm whitespace-pre-wrap'>
                            {dispute.response}
                          </div>
                        </div>
                      )}
                      {dispute.resolution && (
                        <div>
                          <div className='text-muted-foreground text-sm'>
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

            {/* Review */}
            {order.status === 'completed' && review && (
              <Card className='rounded-lg'>
                <CardContent className='space-y-3 p-4'>
                  <div className='flex items-center justify-between'>
                    <h3 className='font-medium'>
                      <Trans>Your review</Trans>
                    </h3>
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
                  {review.status === 'published' && !review.visible && (
                    <p className='text-muted-foreground text-xs italic'>
                      <Trans>
                        Hidden until the seller reviews you, or after 14 days.
                      </Trans>
                    </p>
                  )}
                  {review.status === 'hidden' && (
                    <p className='text-xs text-amber-700 italic dark:text-amber-400'>
                      <Trans>This review was hidden by Mochi staff.</Trans>
                    </p>
                  )}
                  {review.status === 'removed' && (
                    <p className='text-xs text-amber-700 italic dark:text-amber-400'>
                      <Trans>This review was removed by Mochi staff.</Trans>
                    </p>
                  )}
                  {review.response && (
                    <div className='space-y-1 border-s-2 ps-3'>
                      <div className='text-muted-foreground text-xs'>
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
                <CardContent className='space-y-3 p-4'>
                  <div className='flex items-center justify-between'>
                    <h3 className='font-medium'>
                      <Trans>Review from </Trans>
                      <Link
                        to={APP_ROUTES.PROFILE(order.seller)}
                        className='hover:text-foreground underline'
                      >
                        {peerReview.reviewer_name ||
                          formatFingerprint(peerReview.reviewer_fingerprint)}
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
              <Card id='order-review' className='scroll-mt-24 rounded-lg'>
                <CardContent className='space-y-5 p-6'>
                  <h3 className='font-semibold'>
                    <Trans>Leave a review</Trans>
                  </h3>
                  <div className='space-y-2'>
                    <Label>
                      <Trans>Rating</Trans>
                    </Label>
                    <div className='flex gap-1'>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type='button'
                          onClick={() => setReviewRating(String(n))}
                          className='focus-visible:ring-ring rounded transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:outline-none'
                          aria-label={plural(n, {
                            one: '# star',
                            other: '# stars',
                          })}
                        >
                          <Star
                            className={`size-8 transition-colors ${
                              n <= Number(reviewRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-muted text-muted-foreground/30 hover:fill-amber-200 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='reviewText'>
                      <Trans>Review</Trans>
                    </Label>
                    <Textarea
                      id='reviewText'
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={3}
                      placeholder={t`Share your experience...`}
                    />
                  </div>
                  <Button
                    onClick={handleReview}
                    loading={loading}
                    icon={<Star className='me-1 size-4' />}
                  >
                    <Trans>Submit review</Trans>
                  </Button>
                </CardContent>
              </Card>
            )}

            <AuditTimeline kind='order' object={order.id} />
          </div>

          {/* Order summary + actions sidebar */}
          <aside className='min-w-0 space-y-4 lg:sticky lg:top-[calc(var(--sticky-top,0px)+4rem)] lg:order-2 lg:self-start'>
            <Card className='rounded-lg'>
              <CardContent className='space-y-4 p-5'>
                <div className='flex items-center justify-between'>
                  <p className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                    <Trans>Order summary</Trans>
                  </p>
                  <StatusBadge status={order.status} />
                </div>

                <div className='bg-muted flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5'>
                  <span className='text-muted-foreground shrink-0 text-xs'>
                    <Trans>Order</Trans>
                  </span>
                  <div className='flex min-w-0 items-center gap-1'>
                    <span className='truncate font-mono text-sm font-medium tabular-nums'>
                      #{order.id}
                    </span>
                    <CopyButton
                      value={String(order.id)}
                      successMessage={t`Order number copied`}
                      className='size-6 shrink-0'
                    />
                  </div>
                </div>

                <dl className='space-y-2.5 text-sm'>
                  <div className='flex items-start justify-between gap-3'>
                    <dt className='text-muted-foreground flex items-center gap-1.5'>
                      <User className='size-3.5' /> <Trans>Seller</Trans>
                    </dt>
                    <dd className='text-right'>
                      <Link
                        to={APP_ROUTES.PROFILE(order.seller)}
                        className='hover:text-foreground underline'
                      >
                        {order.seller_name ||
                          formatFingerprint(order.seller_fingerprint)}
                      </Link>
                    </dd>
                  </div>
                  <div className='flex items-start justify-between gap-3'>
                    <dt className='text-muted-foreground flex items-center gap-1.5'>
                      <Truck className='size-3.5' /> <Trans>Delivery</Trans>
                    </dt>
                    <dd>
                      {DELIVERY_METHODS.find((d) => d.value === order.delivery)
                        ?.label ?? order.delivery}
                    </dd>
                  </div>
                  <div className='flex items-start justify-between gap-3'>
                    <dt className='text-muted-foreground flex items-center gap-1.5'>
                      <Clock className='size-3.5' /> <Trans>Purchased</Trans>
                    </dt>
                    <dd>{formatTimestamp(order.created)}</dd>
                  </div>
                </dl>

                {order.carrier && (
                  <div className='border-border bg-surface-2 space-y-2 rounded-md border p-3'>
                    <div className='flex items-center gap-2'>
                      <Truck className='text-primary size-4' />
                      <span className='text-sm font-medium'>
                        {order.carrier}
                      </span>
                    </div>
                    {order.tracking && (
                      <p className='text-muted-foreground font-mono text-xs break-all'>
                        {order.tracking}
                      </p>
                    )}
                    {order.url && (
                      <a
                        href={order.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline'
                      >
                        <Trans>Track package</Trans>
                        <ExternalLink className='size-3' />
                      </a>
                    )}
                  </div>
                )}

                <div className='border-border space-y-2 border-t pt-3'>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-muted-foreground text-sm'>
                      <Trans>Total</Trans>
                    </span>
                    <span className='text-2xl font-bold tabular-nums'>
                      {formatPrice(order.total, order.currency)}
                    </span>
                  </div>
                  {order.refunded > 0 && (
                    <div className='flex items-baseline justify-between text-sm'>
                      <span className='text-muted-foreground'>
                        {order.refunded < order.total
                          ? t`Refunded (partial)`
                          : t`Refunded`}
                      </span>
                      <span className='font-medium tabular-nums'>
                        {formatPrice(order.refunded, order.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {hasActions && (
              <Card className='rounded-lg'>
                <CardContent className='space-y-2 p-4'>
                  {primaryAction && (
                    <Button
                      className='h-11 w-full'
                      onClick={primaryAction.onClick}
                      loading={loading}
                      icon={primaryAction.icon}
                    >
                      {primaryAction.label}
                    </Button>
                  )}
                  {canBuyAgain && (
                    <Link
                      to={APP_ROUTES.LISTINGS.VIEW(listing.id)}
                      className='block'
                    >
                      <Button variant='outline' className='w-full'>
                        <ShoppingBag className='size-4' />
                        <Trans>Buy again</Trans>
                      </Button>
                    </Link>
                  )}
                  {listing && (
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={() => setMessageOpen(true)}
                    >
                      <MessageCircle className='size-4' />
                      <Trans>Message seller</Trans>
                    </Button>
                  )}
                  {canRequestRefund && (
                    <Button
                      variant='ghost'
                      className='text-muted-foreground hover:text-destructive w-full'
                      onClick={() => setRefundOpen(true)}
                    >
                      <Receipt className='size-4' />
                      <Trans>Request refund</Trans>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        {/* Mobile-only sticky action bar */}
        {primaryAction && (
          <div className='border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky right-0 bottom-0 left-0 z-30 -mx-2 mt-4 border-t px-4 py-3 shadow-lg backdrop-blur md:-mx-4 lg:hidden'>
            <Button
              className='h-11 w-full'
              onClick={primaryAction.onClick}
              loading={loading}
              icon={primaryAction.icon}
            >
              {primaryAction.label}
            </Button>
          </div>
        )}

        <ConfirmDialog
          open={refundOpen}
          onOpenChange={setRefundOpen}
          title={t`Request refund`}
          desc={t`Provide a reason for your refund request.`}
          handleConfirm={handleRefund}
          confirmText={t`Request refund`}
          isLoading={loading}
        >
          <div className='space-y-3'>
            <div>
              <Label>
                <Trans>Reason</Trans>
              </Label>
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
              <Label htmlFor='refundDesc'>
                <Trans>Details</Trans>
              </Label>
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

function OrderStatusHero({
  status,
  delivery,
  hasAssets,
}: {
  status: string
  delivery: string
  hasAssets: boolean
}) {
  const config = useHeroConfig(status, delivery, hasAssets)
  if (!config) return null
  const Icon = config.icon
  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 ${config.tone}`}
    >
      <span
        className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}
      >
        <Icon className='size-4' />
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-semibold'>{config.title}</p>
        <p className='text-muted-foreground text-xs'>{config.description}</p>
      </div>
    </div>
  )
}

function useHeroConfig(status: string, delivery: string, hasAssets: boolean) {
  const { t } = useLingui()
  if (status === 'pending') {
    return {
      icon: Clock,
      title: t`Payment pending`,
      description: t`Complete your payment to place this order. The seller will be notified once paid.`,
      tone: 'border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40',
      iconBg:
        'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200',
    }
  }
  if (status === 'paid' && delivery === 'download' && hasAssets) {
    return {
      icon: Download,
      title: t`Your purchase is ready`,
      description: t`Download your files below.`,
      tone: 'border-primary/30 bg-primary/5',
      iconBg: 'bg-primary/15 text-primary',
    }
  }
  if (status === 'paid') {
    return {
      icon: CheckCircle2,
      title: t`Payment received`,
      description:
        delivery === 'pickup'
          ? t`Coordinate pickup with the seller. Confirm receipt once you have the item.`
          : t`The seller has been notified and will fulfil your order.`,
      tone: 'border-primary/30 bg-primary/5',
      iconBg: 'bg-primary/15 text-primary',
    }
  }
  if (status === 'shipped') {
    return {
      icon: Truck,
      title: t`On the way`,
      description: t`Your order has shipped. Confirm receipt when it arrives.`,
      tone: 'border-primary/30 bg-primary/5',
      iconBg: 'bg-primary/15 text-primary',
    }
  }
  if (status === 'delivered' || status === 'completed') {
    return {
      icon: CheckCircle2,
      title: status === 'completed' ? t`Order complete` : t`Delivered`,
      description:
        status === 'completed'
          ? t`Thanks for your purchase. Leave a review if you have a moment.`
          : t`Your order was marked as delivered.`,
      tone: 'border-green-300 bg-green-50 dark:border-green-800/60 dark:bg-green-950/40',
      iconBg:
        'bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-200',
    }
  }
  if (status === 'refunded' || status === 'cancelled') {
    return {
      icon: Package,
      title: status === 'refunded' ? t`Refunded` : t`Cancelled`,
      description:
        status === 'refunded'
          ? t`This order has been refunded.`
          : t`This order was cancelled.`,
      tone: 'border-border bg-muted',
      iconBg: 'bg-background text-muted-foreground',
    }
  }
  if (status === 'disputed') {
    return {
      icon: Package,
      title: t`Refund under review`,
      description: t`Your refund request is being reviewed.`,
      tone: 'border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40',
      iconBg:
        'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200',
    }
  }
  return null
}
