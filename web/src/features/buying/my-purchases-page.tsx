import { useEffect } from 'react'
import { Link, useLoaderData, useSearch } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { Gavel, ShoppingCart } from 'lucide-react'
import {
  Button,
  EmptyState,
  GeneralError,
  ListSkeleton,
  LoadMore,
  Main,
  PageHeader,
  toast,
  useLoadMore,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Bid, Order } from '@/types'
import { ordersApi } from '@/api/orders'
import { useFormatPrice, formatFingerprint } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function MyPurchasesPage() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle(t`Purchases`)
  const { data, wonBids, error } = useLoaderData({
    from: '/_authenticated/purchases',
  })
  const search = useSearch({ strict: false }) as { paid?: string }

  // Stripe success_url lands here with ?paid=1 — surface a toast and clean
  // the query param so a refresh doesn't fire it again.
  useEffect(() => {
    if (search.paid) {
      toast.success(t`Order placed`)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [search.paid, t])

  const {
    items: orders,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useLoadMore<Order>({
    fetcher: (p) => ordersApi.purchases(p).then((r) => ({ items: r.orders, total: r.total })),
    initial: data ? { items: data.orders as Order[], total: data.total } : undefined,
  })

  const hasWonBids = wonBids && wonBids.length > 0
  const hasOrders = orders.length > 0

  return (
    <>
      <PageHeader icon={<ShoppingCart className='size-4 md:size-5' />} title={t`Purchases`} />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data ? (
          <ListSkeleton count={5} />
        ) : !hasWonBids && !hasOrders ? (
          <EmptyState icon={ShoppingCart} title={t`No purchases`} />
        ) : (
          <div className='space-y-4'>
            {hasWonBids && (
              <div className='space-y-2'>
                {wonBids.map((bid: Bid) => (
                  <Link key={bid.id} to={APP_ROUTES.LISTINGS.VIEW(bid.listing || 0)}>
                    <div className='flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 transition-all hover:border-green-300 hover:shadow-md dark:border-green-900 dark:bg-green-900/20 dark:hover:border-green-800'>
                      <div className='min-w-0'>
                        <p className='truncate font-medium'>
                          <Gavel className='me-1 inline size-4' />
                          {bid.title || t`Auction #${bid.auction}`}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          <Trans>Won for {formatPrice(bid.amount, bid.currency ?? 'gbp')}</Trans>
                        </p>
                      </div>
                      <Button size='sm'><Trans>Complete purchase</Trans></Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {hasOrders && (
              <div className='space-y-2'>
                {orders.map((order: Order) => (
                  <Link key={order.id} to={APP_ROUTES.PURCHASE(order.id)}>
                    <div className='flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary/30 hover:shadow-md'>
                      <div className='min-w-0'>
                        <p className='truncate font-medium'>
                          {order.title || t`Order #${order.id}`}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {(order.seller_name || formatFingerprint(order.seller))} &middot;{' '}
                          {formatTimestamp(order.created)}
                        </p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <div className='text-end'>
                          <div className='text-sm font-medium'>
                            {formatPrice(order.total, order.currency)}
                          </div>
                          {order.refunded > 0 &&
                            order.refunded < order.total && (
                              <div className='text-xs text-muted-foreground'>
                                −{formatPrice(order.refunded, order.currency)}{' '}
                                refunded
                              </div>
                            )}
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {hasOrders && (
              <LoadMore
                hasMore={hasMore}
                isLoading={isLoading}
                onLoadMore={loadMore}
                totalShown={orders.length}
                total={total}
              />
            )}
          </div>
        )}
      </Main>
    </>
  )
}
