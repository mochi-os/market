import { useLoaderData } from '@tanstack/react-router'
import { Gavel } from 'lucide-react'
import {
  EmptyState,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
} from '@mochi/web'
import { formatTimestamp } from '@mochi/web'
import type { Bid } from '@/types'
import { formatPrice } from '@/lib/format'
import { StatusBadge } from '@/components/shared/status-badge'

export function MyBidsPage() {
  const { data, error } = useLoaderData({ from: '/_authenticated/bids' })

  return (
    <>
      <PageHeader icon={<Gavel className='size-4 md:size-5' />} title='Bids' />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data ? (
          <ListSkeleton count={5} />
        ) : data.bids.length === 0 ? (
          <EmptyState icon={Gavel} title='No bids' />
        ) : (
          <div className='space-y-2'>
            {data.bids.map((bid: Bid) => (
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
                    {formatTimestamp(bid.created * 1000)}
                  </p>
                </div>
                <StatusBadge status={bid.status} />
              </div>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
