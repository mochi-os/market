import { Link, useLoaderData } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
import { Users } from 'lucide-react'
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
import { subscriptionsApi } from '@/api/subscriptions'
import type { Subscription } from '@/types'
import { useFormatPrice, formatFingerprint } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function MySubscribersPage() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle(t`Subscribers`)
  const { data, error } = useLoaderData({
    from: '/_authenticated/subscribers',
  })

  const {
    items: subscriptions,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useLoadMore<Subscription>({
    fetcher: (p) =>
      subscriptionsApi.subscribers(p).then((r) => ({ items: r.subscriptions, total: r.total })),
    initial: data
      ? { items: data.subscriptions as Subscription[], total: data.total }
      : undefined,
  })

  return (
    <>
      <PageHeader icon={<Users className='size-4 md:size-5' />} title={t`Subscribers`} />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data && isLoading ? (
          <ListSkeleton count={5} />
        ) : subscriptions.length === 0 ? (
          <EmptyState icon={Users} title={t`No subscribers`} />
        ) : (
          <>
            <div className='space-y-2'>
              {subscriptions.map((sub: Subscription) => (
                <div
                  key={sub.id}
                  className='flex items-center justify-between rounded-lg border p-4'
                >
                  <div className='min-w-0'>
                    <p className='truncate font-medium'>
                      <Link
                        to={APP_ROUTES.PROFILE(sub.buyer)}
                        className='underline hover:text-foreground'
                      >
                        {sub.buyer_name || formatFingerprint(sub.buyer)}
                      </Link>
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {sub.title} &middot;{' '}
                      {formatTimestamp(sub.created)}
                    </p>
                    {sub.cancelled > 0 &&
                      (sub.status === 'active' || sub.status === 'paused') && (
                        <p className='text-xs text-amber-700 dark:text-amber-400'>
                          {sub.ends
                            ? `Cancels on ${formatTimestamp(sub.ends)}`
                            : 'Cancels at the end of the current period'}
                        </p>
                      )}
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm'>
                      {formatPrice(sub.amount, sub.currency)}
                      {sub.interval === 'yearly' ? ' per year' : ' per month'}
                    </span>
                    <StatusBadge status={sub.status} />
                  </div>
                </div>
              ))}
            </div>
            <LoadMore
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
              totalShown={subscriptions.length}
              total={total}
            />
          </>
        )}
      </Main>
    </>
  )
}
