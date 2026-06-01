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
        <div className='mx-auto max-w-2xl space-y-6'>
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
            <div className='h-28 bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5' />
            <CardContent className='px-6 pb-6 pt-0'>
              <div className='-mt-10 mb-4 flex items-end gap-4'>
                <div className='shrink-0 rounded-xl ring-4 ring-card overflow-hidden'>
                  <EntityAvatar
                    src={`${getAppPath()}/-/user/${account.id}/asset/avatar`}
                    styleUrl={`${getAppPath()}/-/user/${account.id}/asset/style`}
                    seed={account.id}
                    name={account.name || 'Anonymous'}
                    size="2xl"
                  />
                </div>
                <div className='mb-1 min-w-0 flex-1'>
                  <h2 className='flex items-center gap-1.5 truncate text-xl font-bold leading-tight'>
                    {account.name || 'Anonymous'}
                    {account.verified >= 2 && (
                      <BadgeCheck className='size-5 shrink-0 text-green-600 dark:text-green-400' />
                    )}
                  </h2>
                  <p className='text-sm text-muted-foreground'>
                    {account.sales} sale{account.sales !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {account.biography && (
                <p className='mb-4 text-sm text-muted-foreground leading-relaxed'>
                  {account.biography}
                </p>
              )}
              <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
                {account.location && (
                  <span className='flex items-center gap-1'>
                    <MapPin className='size-3.5' />
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
                    <CardContent className='p-5 space-y-3'>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex gap-0.5'>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`size-4 ${
                                i < review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-muted text-muted-foreground/20'
                              }`}
                            />
                          ))}
                        </div>
                        <span className='text-xs text-muted-foreground'>
                          {formatTimestamp(review.created)}
                        </span>
                      </div>
                      {review.text && (
                        <p className='text-sm leading-relaxed'>{review.text}</p>
                      )}
                      {review.response && (
                        <div className='rounded-md bg-muted/50 p-3 space-y-1'>
                          <p className='text-xs font-medium text-muted-foreground'><Trans>Seller response</Trans></p>
                          <p className='text-sm'>
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
