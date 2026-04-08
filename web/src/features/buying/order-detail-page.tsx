import { useState } from 'react'
import { useLoaderData, useNavigate } from '@tanstack/react-router'
import { Download, Package } from 'lucide-react'
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
  getErrorMessage,
} from '@mochi/web'
import { formatTimestamp } from '@mochi/web'
import { ordersApi } from '@/api/orders'
import { reviewsApi } from '@/api/reviews'
import { formatPrice } from '@/lib/format'
import { DISPUTE_REASONS } from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function OrderDetailPage() {
  usePageTitle('Order')
  const { data, error } = useLoaderData({
    from: '/_authenticated/purchases_/$orderId',
  })
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('other')
  const [refundDesc, setRefundDesc] = useState('')
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewText, setReviewText] = useState('')

  if (error) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title='Order' />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title='Order' />
        <Main>
          <EmptyState icon={Package} title='Order not found' />
        </Main>
      </>
    )
  }

  const { order, listing, assets } = data

  async function handleConfirmDelivery() {
    setLoading(true)
    try {
      await ordersApi.confirm(order.id)
      toast.success('Delivery confirmed')
      window.location.reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to confirm'))
    } finally {
      setLoading(false)
    }
  }

  async function handleRefund() {
    setLoading(true)
    try {
      await ordersApi.refund({
        id: order.id,
        reason: refundReason,
        description: refundDesc,
      })
      toast.success('Refund requested')
      setRefundOpen(false)
      window.location.reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to request refund'))
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
      toast.success('Review submitted')
      setReviewText('')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit review'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        icon={<Package className='size-4 md:size-5' />}
        title={listing?.title || `Order #${order.id}`}
        back={{ label: 'Purchases', onFallback: () => navigate({ to: APP_ROUTES.PURCHASES }) }}
      />
      <Main>
        <div className='max-w-2xl space-y-4'>
          <Card className='rounded-[10px]'>
            <CardContent className='p-4 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Status</span>
                <StatusBadge status={order.status} />
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Total</span>
                <span className='font-medium'>
                  {formatPrice(order.total, order.currency)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Delivery</span>
                <span className='text-sm capitalize'>{order.delivery}</span>
              </div>
              {order.carrier && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>
                    Tracking
                  </span>
                  <span className='text-sm'>
                    {order.carrier}
                    {order.tracking && `: ${order.tracking}`}
                  </span>
                </div>
              )}
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Created</span>
                <span className='text-sm'>
                  {formatTimestamp(order.created)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Digital assets download */}
          {assets.length > 0 && (
            <Card className='rounded-[10px]'>
              <CardContent className='p-4 space-y-2'>
                <h3 className='font-medium'>Downloads</h3>
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className='flex items-center justify-between text-sm'
                  >
                    <span>{asset.filename}</span>
                    <Button variant='ghost' size='sm'>
                      <Download className='size-4' />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className='flex gap-2'>
            {(order.status === 'shipped' || order.status === 'delivered') && (
              <Button onClick={handleConfirmDelivery} disabled={loading}>
                Confirm delivery
              </Button>
            )}
            {order.status !== 'refunded' &&
              order.status !== 'cancelled' &&
              order.status !== 'disputed' && (
                <Button
                  variant='outline'
                  onClick={() => setRefundOpen(true)}
                >
                  Request refund
                </Button>
              )}
          </div>

          {/* Review */}
          {order.status === 'completed' && (
            <Card className='rounded-[10px]'>
              <CardContent className='p-4 space-y-3'>
                <h3 className='font-medium'>Leave a review</h3>
                <div>
                  <Label>Rating</Label>
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
                  <Label htmlFor='reviewText'>Review</Label>
                  <Textarea
                    id='reviewText'
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleReview} disabled={loading}>
                  Submit review
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <ConfirmDialog
          open={refundOpen}
          onOpenChange={setRefundOpen}
          title='Request refund'
          desc='Provide a reason for your refund request.'
          handleConfirm={handleRefund}
          confirmText='Request refund'
          destructive
          isLoading={loading}
        >
          <div className='space-y-3'>
            <div>
              <Label>Reason</Label>
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
              <Label htmlFor='refundDesc'>Details</Label>
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
    </>
  )
}
