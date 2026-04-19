import { useState } from 'react'
import { useLoaderData, useNavigate } from '@tanstack/react-router'
import { MoreHorizontal, Package, Pause, Play, X } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  GeneralError,
  ListSkeleton,
  LoadMore,
  Main,
  PageHeader,
  toast,
  getErrorMessage,
  useLoadMore,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import { subscriptionsApi } from '@/api/subscriptions'
import { APP_ROUTES } from '@/config/routes'
import type { Subscription } from '@/types'
import { useFormatPrice } from '@/lib/format'
import { StatusBadge } from '@/components/shared/status-badge'

export function MySubscriptionsPage() {
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle('Subscriptions')
  const navigate = useNavigate()
  const { data, error } = useLoaderData({
    from: '/_authenticated/subscriptions',
  })
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    items: subscriptions,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useLoadMore<Subscription>({
    fetcher: (p) =>
      subscriptionsApi.mine(p).then((r) => ({ items: r.subscriptions, total: r.total })),
    initial: data
      ? { items: data.subscriptions as Subscription[], total: data.total }
      : undefined,
  })

  async function handlePause(id: number) {
    try {
      await subscriptionsApi.pause(id)
      toast.success('Subscription paused')
      window.location.reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to pause'))
    }
  }

  async function handleResume(id: number) {
    try {
      await subscriptionsApi.resume(id)
      toast.success('Subscription resumed')
      window.location.reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to resume'))
    }
  }

  async function handleReactivate(id: number) {
    try {
      await subscriptionsApi.reactivate(id)
      toast.success('Subscription reactivated')
      window.location.reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reactivate'))
    }
  }

  async function handleCancel() {
    if (cancelId == null) return
    setLoading(true)
    try {
      await subscriptionsApi.cancel(cancelId)
      toast.success('Subscription cancelled')
      setCancelId(null)
      window.location.reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to cancel'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader icon={<Package className='size-4 md:size-5' />} title='Subscriptions' />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data && isLoading ? (
          <ListSkeleton count={5} />
        ) : subscriptions.length === 0 ? (
          <EmptyState icon={Package} title='No subscriptions' />
        ) : (
          <>
          <div className='space-y-2'>
            {subscriptions.map((sub: Subscription) => (
              <div
                key={sub.id}
                className='flex items-center justify-between rounded-[10px] border p-4'
              >
                <div className='min-w-0'>
                  <p className='truncate font-medium'>
                    {sub.title || `Subscription #${sub.id}`}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {formatPrice(sub.amount, sub.currency)}/
                    {sub.interval === 'yearly' ? 'yr' : 'mo'} &middot;{' '}
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
                <div className='flex items-center gap-2'>
                  <StatusBadge status={sub.status} />
                  {(sub.status === 'active' ||
                    sub.status === 'paused' ||
                    sub.status === 'cancelled') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon' className='size-8'>
                          <MoreHorizontal className='size-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        {sub.status === 'active' && sub.cancelled === 0 && (
                          <DropdownMenuItem
                            onClick={() => handlePause(sub.id)}
                          >
                            <Pause className='mr-2 size-4' /> Pause
                          </DropdownMenuItem>
                        )}
                        {sub.status === 'paused' && sub.cancelled === 0 && (
                          <DropdownMenuItem
                            onClick={() => handleResume(sub.id)}
                          >
                            <Play className='mr-2 size-4' /> Resume
                          </DropdownMenuItem>
                        )}
                        {sub.status === 'cancelled' ? (
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({ to: APP_ROUTES.CHECKOUT(sub.listing) })
                            }
                          >
                            <Play className='mr-2 size-4' /> Re-subscribe
                          </DropdownMenuItem>
                        ) : sub.cancelled === 0 ? (
                          <DropdownMenuItem
                            onClick={() => setCancelId(sub.id)}
                          >
                            <X className='mr-2 size-4' /> Cancel
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleReactivate(sub.id)}
                          >
                            <Play className='mr-2 size-4' /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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

        <ConfirmDialog
          open={cancelId != null}
          onOpenChange={(open) => !open && setCancelId(null)}
          title='Cancel subscription'
          desc='This will cancel your subscription. You will lose access at the end of your current billing period.'
          handleConfirm={handleCancel}
          confirmText='Cancel subscription'
          destructive
          isLoading={loading}
        />
      </Main>
    </>
  )
}
