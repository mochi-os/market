import { Link } from '@tanstack/react-router'
import { BadgeCheck, Package } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { Card, CardContent, EntityAvatar, getAppPath } from '@mochi/web'
import type { Listing, Photo } from '@/types'
import { getThumbnailUrl } from '@/lib/photos'
import { formatFingerprint } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { ConditionBadge } from './condition-badge'
import { PriceDisplay } from './price-display'

interface ListingCardProps {
  listing: Listing
  photo?: Photo
}

export function ListingCard({ listing, photo }: ListingCardProps) {
  return (
    <Link
      to={APP_ROUTES.LISTINGS.VIEW(listing.id)}
      className='group block focus-visible:outline-none'
    >
      <Card className='overflow-hidden rounded-lg p-0 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/40 hover:shadow-md group-active:scale-[0.99] group-focus-visible:ring-2 group-focus-visible:ring-ring/40'>
        <div className='relative aspect-[4/3] w-full overflow-hidden bg-muted'>
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
                No image
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
        </div>
        <CardContent className='space-y-1.5 p-3 sm:space-y-2 sm:p-3.5'>
          <h3 className='line-clamp-2 text-xs font-medium leading-snug transition-colors group-hover:text-primary sm:text-sm'>
            {listing.title}
          </h3>
          <div className='flex items-baseline justify-between gap-2'>
            <div className='text-sm font-semibold tabular-nums sm:text-base'>
              <PriceDisplay listing={listing} />
            </div>
          </div>
          {listing.seller && (() => {
            const sellerLabel =
              listing.seller_name || formatFingerprint(listing.seller)
            return (
              <p className='flex min-w-0 items-center gap-1.5 truncate border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground sm:pt-2 sm:text-xs'>
                <EntityAvatar
                  src={`${getAppPath()}/-/user/${listing.seller}/asset/avatar`}
                  styleUrl={`${getAppPath()}/-/user/${listing.seller}/asset/style`}
                  seed={listing.seller}
                  name={sellerLabel}
                  size={16}
                />
                <span className='truncate'>{sellerLabel}</span>
                {!!listing.seller_onboarded && (
                  <BadgeCheck className='size-3 shrink-0 text-green-600 dark:text-green-400' />
                )}
              </p>
            )
          })()}
        </CardContent>
      </Card>
    </Link>
  )
}

export function ListingCardFromSearch({ listing }: { listing: Listing }) {
  return <ListingCard listing={listing} photo={listing.photo ?? undefined} />
}
