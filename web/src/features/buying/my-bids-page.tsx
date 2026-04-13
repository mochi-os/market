import { Link, useLoaderData } from '@tanstack/react-router'
import { Gavel } from 'lucide-react'
import {
  Button,
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
import type { Bid } from '@/types'
import { bidsApi } from '@/api/auctions'
import { useFormatPrice } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function MyBidsPage() {
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle('Bids')
  const { data, error } = useLoaderData({ from: '/_authenticated/bids' })

  const {
    items: bids,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useLoadMore<Bid>({
    fetcher: (p) => bidsApi.mine(p).then((r) => ({ items: r.bids, total: r.total })),
    initial: data ? { items: data.bids as Bid[], total: data.total } : undefined,
  })

  return (
    <>
      <PageHeader icon={<Gavel className='size-4 md:size-5' />} title='Bids' />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data && isLoading ? (
          <ListSkeleton count={5} />
        ) : bids.length === 0 ? (
          <EmptyState icon={Gavel} title='No bids' />
        ) : (
          <>
            <div className='space-y-2'>
              {bids.map((bid: Bid) => (
                <div
                  key={bid.id}
                  className='flex items-center justify-between rounded-[10px] border p-4'
                >
                  <div className='min-w-0'>
                    <p className='truncate font-medium'>
                      {bid.title || `Auction #${bid.auction}`}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Your bid:{' '}
                      {formatPrice(bid.amount, bid.currency ?? 'gbp')}
                      {bid.current_bid
                        ? ` \u00b7 Current: ${formatPrice(bid.current_bid, bid.currency ?? 'gbp')}`
                        : ''}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {formatTimestamp(bid.created)}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    {bid.status === 'won' && bid.listing && (
                      <Link to={APP_ROUTES.CHECKOUT(bid.listing)}>
                        <Button size='sm'>Complete purchase</Button>
                      </Link>
                    )}
                    <StatusBadge status={bid.status} />
                  </div>
                </div>
              ))}
            </div>
            <LoadMore
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
              totalShown={bids.length}
              total={total}
            />
          </>
        )}
      </Main>
    </>
  )
}
