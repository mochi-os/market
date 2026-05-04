import { Link, useLoaderData } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
import { Inbox } from 'lucide-react'
import {
  Badge,
  EmptyState,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Thread } from '@/types'

export function MessagesPage() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  usePageTitle(t`Messages`)
  const { data, error } = useLoaderData({
    from: '/_authenticated/messages',
  })

  return (
    <>
      <PageHeader icon={<Inbox className='size-4 md:size-5' />} title={t`Messages`} />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        {!data ? (
          <ListSkeleton count={5} />
        ) : data.threads.length === 0 ? (
          <EmptyState icon={Inbox} title={t`No messages`} />
        ) : (
          <div className='space-y-2'>
            {data.threads.map((thread: Thread) => (
              <Link key={thread.id} to='/listings/$listingId/messages/$threadId' params={{ listingId: String(thread.listing), threadId: String(thread.id) }}>
                <div className='flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary/30 hover:shadow-md'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <p className='truncate font-medium'>
                        {thread.other_name || `Thread #${thread.id}`}
                      </p>
                      {(thread.unread ?? 0) > 0 && (
                        <Badge variant='default' className='size-5 justify-center rounded-full p-0 text-xs'>
                          {thread.unread}
                        </Badge>
                      )}
                    </div>
                    {thread.title && (
                      <p className='truncate text-xs text-muted-foreground'>
                        {thread.title}
                      </p>
                    )}
                    {thread.last_message && (
                      <p className='mt-0.5 truncate text-sm text-muted-foreground'>
                        {thread.last_message}
                      </p>
                    )}
                  </div>
                  {thread.last_message_time && (
                    <span className='shrink-0 text-xs text-muted-foreground'>
                      {formatTimestamp(thread.last_message_time)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
