import { Link, useLoaderData } from '@tanstack/react-router'
import { List, Plus } from 'lucide-react'
import {
  Button,
  EmptyState,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
} from '@mochi/web'
import { formatTimestamp } from '@mochi/web'
import type { Listing } from '@/types'
import { formatPrice } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function MyListingsPage() {
  const { data, error } = useLoaderData({
    from: '/_authenticated/listings/mine',
  })

  return (
    <>
      <PageHeader
        icon={<List className='size-4 md:size-5' />}
        title='My listings'
        actions={
          <Link to={APP_ROUTES.LISTINGS.CREATE}>
            <Button size='sm'>
              <Plus className='size-4' />
              Create listing
            </Button>
          </Link>
        }
      />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data ? (
          <ListSkeleton count={5} />
        ) : data.listings.length === 0 ? (
          <EmptyState icon={List} title='No listings' />
        ) : (
          <div className='space-y-2'>
            {data.listings.map((listing: Listing) => (
              <Link
                key={listing.id}
                to={
                  listing.status === 'draft'
                    ? APP_ROUTES.LISTINGS.EDIT(listing.id)
                    : APP_ROUTES.LISTINGS.VIEW(listing.id)
                }
              >
                <div className='flex items-center justify-between rounded-[10px] border p-4 transition-all hover:border-primary/30 hover:shadow-md'>
                  <div className='min-w-0'>
                    <p className='truncate font-medium'>{listing.title}</p>
                    <p className='text-xs text-muted-foreground'>
                      {formatTimestamp(listing.created * 1000)}
                    </p>
                  </div>
                  <div className='flex items-center gap-3'>
                    {listing.price > 0 && (
                      <span className='text-sm font-medium'>
                        {formatPrice(listing.price, listing.currency)}
                      </span>
                    )}
                    <StatusBadge status={listing.status} />
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
