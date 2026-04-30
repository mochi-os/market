import { Link, useLoaderData } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
import { ShoppingBag } from 'lucide-react'
import {
  EmptyState,
  GeneralError,
  ListSkeleton,
  LoadMore,
  Main,
  PageHeader,
  useLoadMore,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Order } from '@/types'
import { ordersApi } from '@/api/orders'
import { useFormatPrice, formatFingerprint } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function MySalesPage() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle(t`Sales`)
  const { data, error } = useLoaderData({ from: '/_authenticated/sales' })

  const {
    items: orders,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useLoadMore<Order>({
    fetcher: (p) => ordersApi.sales(p).then((r) => ({ items: r.orders, total: r.total })),
    initial: data ? { items: data.orders as Order[], total: data.total } : undefined,
  })

  return (
    <>
      <PageHeader icon={<ShoppingBag className='size-4 md:size-5' />} title={t`Sales`} />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data && isLoading ? (
          <ListSkeleton count={5} />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={t`No sales`} />
        ) : (
          <>
            <div className='space-y-2'>
              {orders.map((order: Order) => (
                <Link key={order.id} to={APP_ROUTES.SALE(order.id)}>
                  <div className='flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary/30 hover:shadow-md'>
                    <div className='min-w-0'>
                      <p className='truncate font-medium'>
                        {order.title || `Order #${order.id}`}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {(order.buyer_name || formatFingerprint(order.buyer))} &middot;{' '}
                        {formatTimestamp(order.created)}
                      </p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <div className='text-right'>
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
            <LoadMore
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
              totalShown={orders.length}
              total={total}
            />
          </>
        )}
      </Main>
    </>
  )
}
