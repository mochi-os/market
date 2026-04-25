import { useState } from 'react'
import { Link, useLoaderData } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  GeneralError,
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
import type { InboxReview } from '@/types'
import { reviewsApi } from '@/api/reviews'
import { APP_ROUTES } from '@/config/routes'

export function ReviewsPage() {
  const { formatTimestamp } = useFormat()
  usePageTitle('Reviews')
  const { data, error } = useLoaderData({ from: '/_authenticated/reviews' })

  const {
    items: reviews,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useLoadMore<InboxReview>({
    fetcher: (p) =>
      reviewsApi.inbox(p).then((r) => ({ items: r.reviews, total: r.total })),
    initial: data
      ? { items: data.reviews as InboxReview[], total: data.total }
      : undefined,
  })

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
      toast.success('Response submitted')
      setRespondTarget(null)
      setResponseText('')
      window.location.reload()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit response'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        icon={<Star className='size-4 md:size-5' />}
        title='Reviews'
      />
      <Main>
        {error && <GeneralError error={error} minimal mode='inline' />}

        {!data && isLoading ? (
          <ListSkeleton count={3} />
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title='No reviews yet'
            description='Reviews you receive will appear here.'
          />
        ) : (
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
                          {review.reviewer_name}
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
                      <div className='flex shrink-0'>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`size-4 ${
                              i < review.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.text && (
                      <p className='text-sm whitespace-pre-wrap'>
                        {review.text}
                      </p>
                    )}
                    {!review.visible && (
                      <p className='text-xs text-muted-foreground italic'>
                        Hidden until you review them, or after 14 days.
                      </p>
                    )}
                    {review.response ? (
                      <div className='border-l-2 pl-3 space-y-1'>
                        <div className='text-xs text-muted-foreground'>
                          Your response
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
                          Respond
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
        )}

        <ConfirmDialog
          open={respondTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setRespondTarget(null)
              setResponseText('')
            }
          }}
          title='Respond to review'
          desc=''
          handleConfirm={handleRespond}
          confirmText='Submit response'
          isLoading={submitting}
          disabled={!responseText.trim()}
        >
          <div>
            <Label htmlFor='responseText'>Your response</Label>
            <Textarea
              id='responseText'
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={4}
            />
          </div>
        </ConfirmDialog>
      </Main>
    </>
  )
}
