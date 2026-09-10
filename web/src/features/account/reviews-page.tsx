// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { APP_ROUTES } from '@/config/routes'
import { Route } from '@/routes/_authenticated/reviews'
import type { InboxReview, SentReview } from '@/types'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  Card,
  CardContent,
  cn,
  ConfirmDialog,
  EmptyState,
  Label,
  ListSkeleton,
  LoadMore,
  Main,
  PageHeader,
  Textarea,
  toast,
  useLoadMore,
  usePageTitle,
  useFormat,
  getErrorMessage,
} from '@mochi/web'
import { Reply, Star } from 'lucide-react'
import { reviewsApi } from '@/api/reviews'
import { formatFingerprint } from '@/lib/format'
import { RatingStars } from '@/components/shared/rating-stars'

type TabId = 'received' | 'sent'

export function ReviewsPage() {
  const { t } = useLingui()
  usePageTitle(t`Reviews`)
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  const activeTab: TabId = tab ?? 'received'

  const tabs: { id: TabId; label: string }[] = [
    { id: 'received', label: t`Received` },
    { id: 'sent', label: t`Sent` },
  ]

  const setActiveTab = (newTab: TabId) => {
    void navigate({ search: { tab: newTab }, replace: true })
  }

  return (
    <>
      <PageHeader
        icon={<Star className='size-4 md:size-5' />}
        title={t`Reviews`}
      />
      <Main>
        <div className='mb-4 flex gap-1 border-b'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'received' ? <ReceivedTab /> : <SentTab />}
      </Main>
    </>
  )
}

function ReceivedTab() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const {
    items: reviews,
    total,
    hasMore,
    isLoading,
    loadMore,
    reset,
  } = useLoadMore<InboxReview>({
    fetcher: (p) =>
      reviewsApi.inbox(p).then((r) => ({ items: r.reviews, total: r.total })),
  })
  useEffect(() => {
    void reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [respondTarget, setRespondTarget] = useState<InboxReview | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleRespond() {
    if (!respondTarget || !responseText.trim()) return
    setSubmitting(true)
    try {
      await reviewsApi.respond({
        id: respondTarget.id,
        response: responseText.trim(),
      })
      toast.success(t`Response submitted`)
      setRespondTarget(null)
      setResponseText('')
      await reset()
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to submit response`))
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading && reviews.length === 0) return <ListSkeleton count={3} />
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title={t`No reviews yet`}
        description={t`Reviews you receive will appear here.`}
      />
    )
  }

  return (
    <>
      <div className='max-w-2xl space-y-3'>
        {reviews.map((review) => {
          const orderUrl =
            review.role === 'buyer'
              ? APP_ROUTES.SALE(review.order)
              : APP_ROUTES.PURCHASE(review.order)
          const reviewer =
            review.reviewer_name ||
            formatFingerprint(review.reviewer_fingerprint)
          return (
            <Card key={review.id} className='rounded-lg'>
              <CardContent className='space-y-2 p-4'>
                <div className='flex items-center justify-between'>
                  <div className='min-w-0'>
                    <p className='font-medium'>
                      {review.listing_title ? (
                        <Trans>
                          <Link
                            to={APP_ROUTES.PROFILE(review.reviewer)}
                            className='hover:text-foreground underline'
                          >
                            {reviewer}
                          </Link>{' '}
                          <span className='text-muted-foreground'>
                            on{' '}
                            <Link
                              to={orderUrl}
                              className='hover:text-foreground underline'
                            >
                              {review.listing_title}
                            </Link>
                          </span>
                        </Trans>
                      ) : (
                        <Link
                          to={APP_ROUTES.PROFILE(review.reviewer)}
                          className='hover:text-foreground underline'
                        >
                          {reviewer}
                        </Link>
                      )}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {formatTimestamp(review.created)}
                    </p>
                  </div>
                  {review.visible && (
                    <RatingStars rating={review.rating} whole size='md' />
                  )}
                </div>
                {review.visible && review.text && (
                  <p className='text-sm whitespace-pre-wrap'>{review.text}</p>
                )}
                {!review.visible && (
                  <p className='text-muted-foreground text-xs italic'>
                    <Trans>
                      Hidden until you review them, or after 14 days.
                    </Trans>
                  </p>
                )}
                {review.visible &&
                  (review.response ? (
                    <div className='space-y-1 border-s-2 ps-3'>
                      <div className='text-muted-foreground text-xs'>
                        <Trans>Your response</Trans>
                      </div>
                      <p className='text-sm whitespace-pre-wrap'>
                        {review.response}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => setRespondTarget(review)}
                      >
                        <Reply className='size-4' />
                        <Trans>Respond</Trans>
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )
        })}
        <LoadMore
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={loadMore}
          totalShown={reviews.length}
          total={total}
        />
      </div>

      <ConfirmDialog
        open={respondTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRespondTarget(null)
            setResponseText('')
          }
        }}
        title={t`Respond to review`}
        desc=''
        handleConfirm={handleRespond}
        confirmText={t`Submit response`}
        isLoading={submitting}
        disabled={!responseText.trim()}
      >
        <div>
          <Label htmlFor='responseText'>
            <Trans>Your response</Trans>
          </Label>
          <Textarea
            id='responseText'
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={4}
          />
        </div>
      </ConfirmDialog>
    </>
  )
}

function SentTab() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const {
    items: reviews,
    total,
    hasMore,
    isLoading,
    loadMore,
    reset,
  } = useLoadMore<SentReview>({
    fetcher: (p) =>
      reviewsApi.sent(p).then((r) => ({ items: r.reviews, total: r.total })),
  })
  useEffect(() => {
    void reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading && reviews.length === 0) return <ListSkeleton count={3} />
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title={t`No reviews sent`}
        description={t`Reviews you leave will appear here.`}
      />
    )
  }

  return (
    <div className='max-w-2xl space-y-3'>
      {reviews.map((review) => {
        const orderUrl =
          review.role === 'buyer'
            ? APP_ROUTES.PURCHASE(review.order)
            : APP_ROUTES.SALE(review.order)
        const subject =
          review.subject_name || formatFingerprint(review.subject_fingerprint)
        return (
          <Card key={review.id} className='rounded-lg'>
            <CardContent className='space-y-2 p-4'>
              <div className='flex items-center justify-between'>
                <div className='min-w-0'>
                  <p className='font-medium'>
                    {review.listing_title ? (
                      <Trans>
                        <Link
                          to={APP_ROUTES.PROFILE(review.subject)}
                          className='hover:text-foreground underline'
                        >
                          {subject}
                        </Link>{' '}
                        <span className='text-muted-foreground'>
                          on{' '}
                          <Link
                            to={orderUrl}
                            className='hover:text-foreground underline'
                          >
                            {review.listing_title}
                          </Link>
                        </span>
                      </Trans>
                    ) : (
                      <Link
                        to={APP_ROUTES.PROFILE(review.subject)}
                        className='hover:text-foreground underline'
                      >
                        {subject}
                      </Link>
                    )}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {formatTimestamp(review.created)}
                  </p>
                </div>
                <RatingStars rating={review.rating} whole size='md' />
              </div>
              {review.text && (
                <p className='text-sm whitespace-pre-wrap'>{review.text}</p>
              )}
              {!review.visible && (
                <p className='text-muted-foreground text-xs italic'>
                  <Trans>Hidden until they review you, or after 14 days.</Trans>
                </p>
              )}
              {review.response ? (
                <div className='space-y-1 border-s-2 ps-3'>
                  <div className='text-muted-foreground text-xs'>
                    <Trans>Their response</Trans>
                  </div>
                  <p className='text-sm whitespace-pre-wrap'>
                    {review.response}
                  </p>
                </div>
              ) : (
                review.visible && (
                  <p className='text-muted-foreground text-xs italic'>
                    <Trans>Awaiting response</Trans>
                  </p>
                )
              )}
            </CardContent>
          </Card>
        )
      })}
      <LoadMore
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={loadMore}
        totalShown={reviews.length}
        total={total}
      />
    </div>
  )
}
