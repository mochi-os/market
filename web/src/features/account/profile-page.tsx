import { useLoaderData } from '@tanstack/react-router'
import { BadgeCheck, MapPin, Star, User } from 'lucide-react'
import {
  Card,
  CardContent,
  EmptyState,
  GeneralError,
  Main,
  PageHeader,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Review } from '@/types'
import { locationName } from '@/lib/format'
import { RatingStars } from '@/components/shared/rating-stars'

export function ProfilePage() {
  const { formatTimestamp } = useFormat()
  const { account, reviews, error } = useLoaderData({
    from: '/_authenticated/account_/$accountId',
  })
  usePageTitle(account?.name || 'Profile')

  if (error) {
    return (
      <>
        <PageHeader icon={<User className='size-4 md:size-5' />} title='Profile' />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!account) {
    return (
      <>
        <PageHeader icon={<User className='size-4 md:size-5' />} title='Profile' />
        <Main>
          <EmptyState icon={User} title='Account not found' />
        </Main>
      </>
    )
  }

  return (
    <>
      <PageHeader icon={<User className='size-4 md:size-5' />} title={account.name || 'Profile'} />
      <Main>
        <div className='max-w-2xl space-y-6'>
          <Card className='rounded-[10px]'>
            <CardContent className='p-4 space-y-3'>
              <h2 className='flex items-center gap-1.5 text-lg font-semibold'>
                {account.name || 'Anonymous'}
                {account.verified >= 2 && (
                  <BadgeCheck className='size-5 text-green-600 dark:text-green-400' />
                )}
              </h2>
              {account.biography && (
                <p className='text-sm text-muted-foreground'>
                  {account.biography}
                </p>
              )}
              {account.location && (
                <p className='text-sm text-muted-foreground'>
                  <MapPin className='mr-1 inline size-3' />
                  {locationName(account.location)}
                </p>
              )}
              {account.rating > 0 && (
                <RatingStars
                  rating={account.rating}
                  reviews={account.reviews}
                />
              )}
              <p className='text-sm text-muted-foreground'>
                {account.sales} sale{account.sales !== 1 ? 's' : ''} &middot;
                Joined {formatTimestamp(account.created)}
              </p>
            </CardContent>
          </Card>

          {reviews && reviews.reviews.length > 0 && (
            <div>
              <h3 className='mb-3 text-lg font-semibold'>Reviews</h3>
              <div className='space-y-3'>
                {reviews.reviews.map((review: Review) => (
                  <Card key={review.id} className='rounded-[10px]'>
                    <CardContent className='p-4 space-y-2'>
                      <div className='flex items-center gap-2'>
                        <div className='flex'>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`size-3.5 ${
                                i < review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <span className='text-xs text-muted-foreground'>
                          {formatTimestamp(review.created)}
                        </span>
                      </div>
                      {review.text && (
                        <p className='text-sm'>{review.text}</p>
                      )}
                      {review.response && (
                        <div className='ml-4 border-l-2 pl-3'>
                          <p className='text-xs font-medium'>Seller response</p>
                          <p className='text-sm text-muted-foreground'>
                            {review.response}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </Main>
    </>
  )
}
