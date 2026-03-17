import { useState } from 'react'
import { useLoaderData } from '@tanstack/react-router'
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
  Main,
  PageHeader,
  toast,
  getErrorMessage,
} from '@mochi/web'
import { formatTimestamp } from '@mochi/web'
import { subscriptionsApi } from '@/api/subscriptions'
import type { Subscription } from '@/types'
import { formatPrice } from '@/lib/format'
import { StatusBadge } from '@/components/shared/status-badge'

export function MySubscriptionsPage() {
  const { data, error } = useLoaderData({
    from: '/_authenticated/subscriptions',
  })
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

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
        {!data ? (
          <ListSkeleton count={5} />
        ) : data.subscriptions.length === 0 ? (
          <EmptyState icon={Package} title='No subscriptions' />
        ) : (
          <div className='space-y-2'>
            {data.subscriptions.map((sub: Subscription) => (
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
                    {formatTimestamp(sub.created * 1000)}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <StatusBadge status={sub.status} />
                  {(sub.status === 'active' || sub.status === 'paused') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon' className='size-8'>
                          <MoreHorizontal className='size-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        {sub.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handlePause(sub.id)}
                          >
                            <Pause className='mr-2 size-4' /> Pause
                          </DropdownMenuItem>
                        )}
                        {sub.status === 'paused' && (
                          <DropdownMenuItem
                            onClick={() => handleResume(sub.id)}
                          >
                            <Play className='mr-2 size-4' /> Resume
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setCancelId(sub.id)}
                        >
                          <X className='mr-2 size-4' /> Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
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
