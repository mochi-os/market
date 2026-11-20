// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { Link, useLoaderData } from '@tanstack/react-router'
import type { Thread } from '@/types'
import { useLingui } from '@lingui/react/macro'
import {
  AssetImage,
  Badge,
  EmptyState,
  EntityAvatar,
  GeneralError,
  ListSkeleton,
  LoadMore,
  Main,
  PageHeader,
  getAppPath,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import { Inbox } from 'lucide-react'
import { threadsApi } from '@/api/threads'
import { formatFingerprint } from '@/lib/format'
import { useCursorList } from '@/lib/paging'
import { getThumbnailUrl } from '@/lib/photos'

// threadParty(thread) -> string: Who a conversation is with, as the inbox names
// them: their name, else their fingerprint; never an id.
function threadParty(thread: Thread): string {
  return thread.other_name || formatFingerprint(thread.other_fingerprint)
}

export function MessagesPage() {
  const { t } = useLingui()
  const { formatTimestamp, formatNumber } = useFormat()
  usePageTitle(t`Messages`)
  const { data, error } = useLoaderData({
    from: '/_authenticated/messages',
  })

  const {
    items: threads,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useCursorList<Thread>({
    fetcher: (p) =>
      threadsApi
        .mine(p)
        .then((r) => ({ items: r.threads, total: r.total, next: r.next })),
    initial: data
      ? { items: data.threads, total: data.total, next: data.next }
      : undefined,
    id: (thread) => thread.id,
    failure: t`Failed to load messages`,
  })

  return (
    <>
      <PageHeader
        icon={<Inbox className='size-4 md:size-5' />}
        title={t`Messages`}
      />
      <Main>
        {error && <GeneralError error={error} minimal mode='inline' />}
        {!data ? (
          <ListSkeleton count={5} />
        ) : threads.length === 0 ? (
          <EmptyState icon={Inbox} title={t`No messages`} />
        ) : (
          <>
            <div className='space-y-2'>
              {threads.map((thread: Thread) => {
                const party = threadParty(thread) || t`Unknown`
                return (
                  <Link
                    key={thread.id}
                    to='/listings/$listingId/messages/$threadId'
                    params={{
                      listingId: String(thread.listing),
                      threadId: String(thread.id),
                    }}
                  >
                    <div className='hover:border-primary/30 flex items-center gap-3 rounded-lg border p-4 transition-all hover:shadow-md'>
                      {thread.other && (
                        <EntityAvatar
                          src={`${getAppPath()}/-/user/${thread.other}/asset/avatar`}
                          styleUrl={`${getAppPath()}/-/user/${thread.other}/asset/style`}
                          seed={thread.other}
                          name={party}
                          size='md'
                        />
                      )}
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <p className='truncate font-medium'>{party}</p>
                          {(thread.unread ?? 0) > 0 && (
                            <Badge
                              variant='default'
                              className='size-5 justify-center rounded-full p-0 text-xs'
                            >
                              {formatNumber(thread.unread ?? 0)}
                            </Badge>
                          )}
                        </div>
                        {thread.title && (
                          <p className='text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs'>
                            {thread.photo && (
                              <AssetImage
                                src={getThumbnailUrl(thread.photo)}
                                alt=''
                                loading='lazy'
                                className='size-5 shrink-0 rounded object-cover'
                              />
                            )}
                            <span className='truncate'>{thread.title}</span>
                          </p>
                        )}
                        {thread.last_message && (
                          <p className='text-muted-foreground mt-0.5 truncate text-sm'>
                            {thread.last_message}
                          </p>
                        )}
                      </div>
                      {thread.last_message_time && (
                        <span className='text-muted-foreground shrink-0 text-xs'>
                          {formatTimestamp(thread.last_message_time)}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
            <LoadMore
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
              totalShown={threads.length}
              total={total}
            />
          </>
        )}
      </Main>
    </>
  )
}
