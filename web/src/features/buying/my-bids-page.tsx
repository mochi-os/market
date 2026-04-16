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
import { Route } from '@/routes/_authenticated/bids'

const FILTERS = [
  { id: undefined, label: 'All' },
  { id: 'active' as const, label: 'Active' },
  { id: 'outbid' as const, label: 'Outbid' },
  { id: 'won' as const, label: 'Won' },
  { id: 'lost' as const, label: 'Lost' },
]

export function MyBidsPage() {
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle('Bids')
  const { data, error } = useLoaderData({ from: '/_authenticated/bids' })
  const { status } = Route.useSearch()
  const navigate = Route.useNavigate()

  const {
    items: bids,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useLoadMore<Bid, { status?: string }>({
    fetcher: (p) => bidsApi.mine(p).then((r) => ({ items: r.bids, total: r.total })),
    initial: data ? { items: data.bids as Bid[], total: data.total } : undefined,
    params: { status },
  })

  return (
    <>
      <PageHeader icon={<Gavel className='size-4 md:size-5' />} title='Bids' />
      <Main>
        <div className='mb-4 flex gap-1 border-b'>
          {FILTERS.map((f) => {
            const active = status === f.id
            return (
              <button
                key={f.label}
                onClick={() => void navigate({ search: f.id ? { status: f.id } : {}, replace: true })}
                className={`border-b-2 px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
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
