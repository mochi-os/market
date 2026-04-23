import { useState } from 'react'
import { useLoaderData, useNavigate } from '@tanstack/react-router'
import { Package, Truck } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  GeneralError,
  Input,
  Label,
  Main,
  PageHeader,
  toast,
  getErrorMessage,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import { ordersApi } from '@/api/orders'
import { useFormatPrice } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function SaleDetailPage() {
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle('Sale')
  const { data, error } = useLoaderData({
    from: '/_authenticated/sales_/$orderId',
  })
  const navigate = useNavigate()
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [loading, setLoading] = useState(false)

  if (error) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title='Sale' />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title='Sale' />
        <Main>
          <EmptyState icon={Package} title='Order not found' />
        </Main>
      </>
    )
  }

  const { order, listing } = data

  async function handleShip() {
    setLoading(true)
    try {
      await ordersApi.ship({
        id: order.id,
        carrier,
        tracking,
        url: trackingUrl,
      })
      toast.success('Marked as shipped')
      window.location.reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to mark as shipped'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        icon={<Package className='size-4 md:size-5' />}
        title={listing?.title || `Sale #${order.id}`}
        back={{ label: 'Sales', onFallback: () => navigate({ to: APP_ROUTES.SALES }) }}
      />
      <Main>
        <div className='max-w-2xl space-y-4'>
          <Card className='rounded-lg'>
            <CardContent className='p-4 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Status</span>
                <StatusBadge status={order.status} />
              </div>
              {order.buyer_name && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>Buyer</span>
                  <span className='text-sm'>{order.buyer_name}</span>
                </div>
              )}
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Total</span>
                <span className='font-medium'>
                  {formatPrice(order.total, order.currency)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Your payout</span>
                <span className='font-medium'>
                  {formatPrice(order.payout, order.currency)}
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
                <span className='text-sm text-muted-foreground'>Purchased</span>
                <span className='text-sm'>
                  {formatTimestamp(order.created)}
                </span>
              </div>
            </CardContent>
          </Card>

          {order.status === 'paid' && order.delivery === 'shipping' && (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-3'>
                <h3 className='font-medium'>Ship order</h3>
                <div>
                  <Label htmlFor='carrier'>Carrier</Label>
                  <Input
                    id='carrier'
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='tracking'>Tracking number</Label>
                  <Input
                    id='tracking'
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='trackingUrl'>Tracking URL</Label>
                  <Input
                    id='trackingUrl'
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                  />
                </div>
                <Button onClick={handleShip} disabled={loading}>
                  <Truck className='mr-1 size-4' />
                  {loading ? 'Shipping...' : 'Mark as shipped'}
                </Button>
              </CardContent>
            </Card>
          )}

          {order.delivery === 'shipping' && order.address_name && (
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-1'>
                <h3 className='font-medium'>Shipping address</h3>
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
        </div>
      </Main>
    </>
  )
}
