import { Link } from '@tanstack/react-router'
import { BadgeCheck, Download, Package } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { Card, CardContent, EntityAvatar, Skeleton, getAppPath } from '@mochi/web'
import type { Listing, Photo } from '@/types'
import { getThumbnailUrl } from '@/lib/photos'
import { formatFingerprint } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { ConditionBadge } from './condition-badge'
import { SavedButton } from './saved-button'
import { PriceDisplay } from './price-display'
import { RatingStars } from './rating-stars'

interface ListingCardProps {
  listing: Listing
  photo?: Photo
}

export function ListingCard({ listing, photo }: ListingCardProps) {
  const sellerLabel = listing.seller
    ? listing.seller_name || formatFingerprint(listing.seller)
    : null

  return (
    <Link
      to={APP_ROUTES.LISTINGS.VIEW(listing.id)}
      className='group flex h-full flex-col focus-visible:outline-none'
    >
      <Card className='flex h-full flex-col overflow-hidden rounded-lg p-0 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/40 hover:shadow-md group-active:scale-[0.99] group-focus-visible:ring-2 group-focus-visible:ring-ring/40'>
        <div className='relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted'>
          {photo ? (
            <img
              src={getThumbnailUrl(photo)}
              alt={listing.title}
              loading='lazy'
              className='size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]'
            />
          ) : (
            <div className='flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-2 to-muted transition-transform duration-300 ease-out group-hover:scale-[1.04]'>
              <span className='inline-flex size-14 items-center justify-center rounded-full bg-background/60 ring-1 ring-border'>
                <Package className='size-7 text-muted-foreground/70' />
              </span>
              <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70'>
                <Trans>No image</Trans>
              </span>
            </div>
          )}
          {listing.condition && (
            <div className='absolute right-2 top-2'>
              <ConditionBadge condition={listing.condition} />
            </div>
          )}
          {listing.pricing !== 'fixed' && (
            <div className='absolute left-2 top-2'>
              <span className='inline-flex items-center rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ring-1 ring-border/60'>
                {listing.pricing === 'auction' && <Trans>Auction</Trans>}
                {listing.pricing === 'subscription' && <Trans>Subscription</Trans>}
                {listing.pricing === 'pwyw' && <Trans>Pay what you want</Trans>}
              </span>
            </div>
          )}
          {listing.type === 'digital' && (
            <div className='absolute bottom-2 left-2'>
              <span className='inline-flex size-6 items-center justify-center rounded-full bg-background/85 backdrop-blur-sm ring-1 ring-border/60'>
                <Download className='size-3 text-muted-foreground' />
              </span>
            </div>
          )}
          <SavedButton listing={listing} />
        </div>
        <CardContent className='flex flex-1 flex-col p-3 sm:p-3.5'>
          <h3 className='line-clamp-2 flex-1 text-xs font-medium leading-snug transition-colors group-hover:text-primary sm:text-sm'>
            {listing.title}
          </h3>
          <div className='mt-auto pt-1.5 sm:pt-2'>
            <div className='text-sm font-semibold tabular-nums sm:text-base'>
              <PriceDisplay listing={listing} />
            </div>
            {sellerLabel && (
              <div className='mt-1.5 border-t border-border/60 pt-1.5 sm:mt-2 sm:pt-2'>
                <p className='flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted-foreground sm:text-xs'>
                  <EntityAvatar
                    src={`${getAppPath()}/-/user/${listing.seller}/asset/avatar`}
                    styleUrl={`${getAppPath()}/-/user/${listing.seller}/asset/style`}
                    seed={listing.seller}
                    name={sellerLabel}
                    size="xs"
                  />
                  <span className='truncate'>{sellerLabel}</span>
                  {!!listing.seller_onboarded && (
                    <BadgeCheck className='size-3 shrink-0 text-success' />
                  )}
                </p>
                <div className='mt-1 h-4'>
                  {(listing.seller_rating ?? 0) > 0 && (
                    <RatingStars
                      rating={listing.seller_rating!}
                      reviews={listing.seller_reviews}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ListingCardFromSearch({ listing }: { listing: Listing }) {
  return <ListingCard listing={listing} photo={listing.photo ?? undefined} />
}

export function ListingCardSkeleton() {
  return (
    <Card className='flex h-full flex-col overflow-hidden rounded-lg p-0'>
      <Skeleton className='aspect-[4/3] w-full rounded-none' />
      <CardContent className='flex flex-1 flex-col p-3 sm:p-3.5'>
        <div className='flex-1 space-y-1.5'>
          <Skeleton className='h-3.5 w-11/12 sm:h-4' />
          <Skeleton className='h-3.5 w-2/3 sm:h-4' />
        </div>
        <div className='mt-auto pt-1.5 sm:pt-2'>
          <Skeleton className='h-4 w-20 sm:h-5 sm:w-24' />
          <div className='mt-1.5 border-t border-border/60 pt-1.5 sm:mt-2 sm:pt-2'>
            <div className='flex items-center gap-1.5'>
              <Skeleton className='size-4 shrink-0 rounded-full' />
              <Skeleton className='h-3 w-24' />
            </div>
            <div className='mt-1 h-4'>
              <Skeleton className='h-3 w-16' />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4'>
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  )
}
