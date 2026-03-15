import { useLoaderData } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import {
  EmptyState,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
} from '@mochi/common'
import { formatTimestamp } from '@mochi/common'
import type { Subscription } from '@/types'
import { formatPrice } from '@/lib/format'
import { StatusBadge } from '@/components/shared/status-badge'

export function MySubscribersPage() {
  const { data, error } = useLoaderData({
    from: '/_authenticated/subscribers',
  })

  return (
    <>
      <PageHeader icon={<Users className='size-4 md:size-5' />} title='Subscribers' />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data ? (
          <ListSkeleton count={5} />
        ) : data.subscriptions.length === 0 ? (
          <EmptyState icon={Users} title='No subscribers' />
        ) : (
          <div className='space-y-2'>
            {data.subscriptions.map((sub: Subscription) => (
              <div
                key={sub.id}
                className='flex items-center justify-between rounded-[10px] border p-4'
              >
                <div className='min-w-0'>
                  <p className='truncate font-medium'>
                    {sub.buyer_name || sub.buyer}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {sub.title} &middot;{' '}
                    {formatTimestamp(sub.created * 1000)}
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <span className='text-sm'>
                    {formatPrice(sub.amount, sub.currency)}/{sub.interval === 'yearly' ? 'yr' : 'mo'}
                  </span>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
