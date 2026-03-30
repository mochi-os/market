import { Link, useLoaderData } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import {
  EmptyState,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  usePageTitle,
} from '@mochi/web'
import { formatTimestamp } from '@mochi/web'
import type { Order } from '@/types'
import { formatPrice } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function MyPurchasesPage() {
  usePageTitle('Purchases')
  const { data, error } = useLoaderData({
    from: '/_authenticated/purchases',
  })

  return (
    <>
      <PageHeader icon={<ShoppingCart className='size-4 md:size-5' />} title='Purchases' />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data ? (
          <ListSkeleton count={5} />
        ) : data.orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title='No purchases' />
        ) : (
          <div className='space-y-2'>
            {data.orders.map((order: Order) => (
              <Link key={order.id} to={APP_ROUTES.PURCHASE(order.id)}>
                <div className='flex items-center justify-between rounded-[10px] border p-4 transition-all hover:border-primary/30 hover:shadow-md'>
                  <div className='min-w-0'>
                    <p className='truncate font-medium'>
                      {order.title || `Order #${order.id}`}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {formatTimestamp(order.created * 1000)}
                    </p>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm font-medium'>
                      {formatPrice(order.total, order.currency)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
