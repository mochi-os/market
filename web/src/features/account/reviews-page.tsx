import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
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
import type { InboxReview, SentReview } from '@/types'
import { reviewsApi } from '@/api/reviews'
import { Route } from '@/routes/_authenticated/reviews'
import { APP_ROUTES } from '@/config/routes'
import { formatFingerprint } from '@/lib/format'
import { RatingStars } from '@/components/shared/rating-stars'

type TabId = 'received' | 'sent'

const tabs: { id: TabId; label: string }[] = [
  { id: 'received', label: "Received" },
  { id: 'sent', label: "Sent" },
]

export function ReviewsPage() {
  const { t } = useLingui()
  usePageTitle(t`Reviews`)
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  const activeTab: TabId = tab ?? 'received'

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
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
                activeTab === t.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
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
          return (
            <Card key={review.id} className='rounded-lg'>
              <CardContent className='p-4 space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='min-w-0'>
                    <p className='font-medium'>
                      <Link
                        to={APP_ROUTES.PROFILE(review.reviewer)}
                        className='underline hover:text-foreground'
                      >
                        {review.reviewer_name || formatFingerprint(review.reviewer)}
                      </Link>
                      {review.listing_title && (
                        <span className='text-muted-foreground'>
                          {' on '}
                          <Link
                            to={orderUrl}
                            className='underline hover:text-foreground'
                          >
                            {review.listing_title}
                          </Link>
                        </span>
                      )}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {formatTimestamp(review.created)}
                    </p>
                  </div>
                  <RatingStars rating={review.rating} whole size="md" />
                </div>
                {review.text && (
                  <p className='text-sm whitespace-pre-wrap'>{review.text}</p>
                )}
                {!review.visible && (
                  <p className='text-xs text-muted-foreground italic'>
                    <Trans>Hidden until you review them, or after 14 days.</Trans>
                  </p>
                )}
                {review.response ? (
                  <div className='border-s-2 ps-3 space-y-1'>
                    <div className='text-xs text-muted-foreground'>
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
                      <Trans>Respond</Trans>
                    </Button>
                  </div>
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
        confirmText='Submit response'
        isLoading={submitting}
        disabled={!responseText.trim()}
      >
        <div>
          <Label htmlFor='responseText'><Trans>Your response</Trans></Label>
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
        return (
          <Card key={review.id} className='rounded-lg'>
            <CardContent className='p-4 space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='min-w-0'>
                  <p className='font-medium'>
                    <Link
                      to={APP_ROUTES.PROFILE(review.subject)}
                      className='underline hover:text-foreground'
                    >
                      {review.subject_name || formatFingerprint(review.subject)}
                    </Link>
                    {review.listing_title && (
                      <span className='text-muted-foreground'>
                        {' on '}
                        <Link
                          to={orderUrl}
                          className='underline hover:text-foreground'
                        >
                          {review.listing_title}
                        </Link>
                      </span>
                    )}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {formatTimestamp(review.created)}
                  </p>
                </div>
                <RatingStars rating={review.rating} whole size="md" />
              </div>
              {review.text && (
                <p className='text-sm whitespace-pre-wrap'>{review.text}</p>
              )}
              {!review.visible && (
                <p className='text-xs text-muted-foreground italic'>
                  <Trans>Hidden until they review you, or after 14 days.</Trans>
                </p>
              )}
              {review.response ? (
                <div className='border-s-2 ps-3 space-y-1'>
                  <div className='text-xs text-muted-foreground'>
                    <Trans>Their response</Trans>
                  </div>
                  <p className='text-sm whitespace-pre-wrap'>
                    {review.response}
                  </p>
                </div>
              ) : (
                review.visible && (
                  <p className='text-xs text-muted-foreground italic'>
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

