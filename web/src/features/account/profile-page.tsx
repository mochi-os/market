import { useLoaderData } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { BadgeCheck, MapPin, Star, User } from 'lucide-react'
import {
  Card,
  CardContent,
  EmptyState,
  EntityAvatar,
  GeneralError,
  Main,
  PageHeader,
  usePageTitle,
  useFormat,
  getAppPath,
} from '@mochi/web'
import type { Review } from '@/types'
import { locationName } from '@/lib/format'
import { RatingStars } from '@/components/shared/rating-stars'

export function ProfilePage() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const { account, reviews, error } = useLoaderData({
    from: '/_authenticated/account_/$accountId',
  })
  usePageTitle(account?.name || 'Profile')

  if (error) {
    return (
      <>
        <PageHeader icon={<User className='size-4 md:size-5' />} title={t`Profile`} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!account) {
    return (
      <>
        <PageHeader icon={<User className='size-4 md:size-5' />} title={t`Profile`} />
        <Main>
          <EmptyState icon={User} title={t`Account not found`} />
        </Main>
      </>
    )
  }

  return (
    <>
      <PageHeader icon={<User className='size-4 md:size-5' />} title={account.name || 'Profile'} />
      <Main>
        <div className='max-w-2xl space-y-6'>
          {account.status === 'suspended' && (
            <Card className='rounded-lg border-amber-200 dark:border-amber-900'>
              <CardContent className='p-4'>
                <p className='text-sm font-medium text-amber-700 dark:text-amber-400'>
                  <Trans>Suspended as seller</Trans>
                </p>
              </CardContent>
            </Card>
          )}
          {account.status === 'banned' && (
            <Card className='rounded-lg border-red-200 dark:border-red-900'>
              <CardContent className='p-4'>
                <p className='text-sm font-medium text-red-700 dark:text-red-400'>
                  <Trans>Account banned</Trans>
                </p>
              </CardContent>
            </Card>
          )}
          <Card className='overflow-hidden rounded-xl'>
            <div className='h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5' />
            <CardContent className='px-4 pb-4 pt-0'>
              <div className='-mt-8 mb-3 flex items-end gap-3'>
                <div className='shrink-0 rounded-xl ring-4 ring-card overflow-hidden'>
                  <EntityAvatar
                    src={`${getAppPath()}/-/user/${account.id}/asset/avatar`}
                    styleUrl={`${getAppPath()}/-/user/${account.id}/asset/style`}
                    seed={account.id}
                    name={account.name || 'Anonymous'}
                    size={64}
                  />
                </div>
                <div className='mb-1 min-w-0'>
                  <h2 className='flex items-center gap-1.5 truncate text-lg font-bold leading-tight'>
                    {account.name || 'Anonymous'}
                    {account.verified >= 2 && (
                      <BadgeCheck className='size-5 shrink-0 text-green-600 dark:text-green-400' />
                    )}
                  </h2>
                  <p className='text-xs text-muted-foreground'>
                    {account.sales} sale{account.sales !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {account.biography && (
                <p className='mb-3 text-sm text-muted-foreground'>
                  {account.biography}
                </p>
              )}
              <div className='flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
                {account.location && (
                  <span>
                    <MapPin className='me-1 inline size-3' />
                    {locationName(account.location)}
                  </span>
                )}
                {account.rating > 0 && (
                  <RatingStars
                    rating={account.rating}
                    reviews={account.reviews}
                  />
                )}
                <span>Joined {formatTimestamp(account.created)}</span>
              </div>
            </CardContent>
          </Card>

          {reviews && reviews.reviews.length > 0 && (
            <div>
              <h3 className='mb-3 text-lg font-semibold'><Trans>Reviews</Trans></h3>
              <div className='space-y-3'>
                {reviews.reviews.map((review: Review) => (
                  <Card key={review.id} className='rounded-lg'>
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
                        <div className='ms-4 border-s-2 ps-3'>
                          <p className='text-xs font-medium'><Trans>Seller response</Trans></p>
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
