import { Link } from '@tanstack/react-router'
import { BadgeCheck, Package } from 'lucide-react'
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
      <Card className='overflow-hidden rounded-lg p-0 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-md group-active:translate-y-0 group-active:scale-[0.99] group-focus-visible:ring-2 group-focus-visible:ring-ring/40'>
        <div className='relative aspect-[4/3] w-full overflow-hidden bg-muted'>
          {photo ? (
            <img
              src={getThumbnailUrl(photo)}
              alt={listing.title}
              loading='lazy'
              className='size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]'
            />
          ) : (
            <div className='flex size-full items-center justify-center bg-gradient-to-br from-muted to-surface-2'>
              <Package className='size-12 text-muted-foreground/40 transition-transform duration-300 ease-out group-hover:scale-110' />
            </div>
          )}
          {listing.condition && (
            <div className='absolute right-2 top-2'>
              <ConditionBadge condition={listing.condition} />
            </div>
          )}
        </div>
        <CardContent className='space-y-2 p-3.5'>
          <h3 className='line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary'>
            {listing.title}
          </h3>
          <div className='flex items-baseline justify-between gap-2'>
            <div className='text-base font-semibold tabular-nums'>
              <PriceDisplay listing={listing} />
            </div>
          </div>
          {listing.seller && (() => {
            const sellerLabel =
              listing.seller_name || formatFingerprint(listing.seller)
            return (
              <p className='flex items-center gap-1.5 truncate border-t border-border/60 pt-2 text-xs text-muted-foreground'>
                <EntityAvatar
                  src={`${getAppPath()}/-/user/${listing.seller}/asset/avatar`}
                  styleUrl={`${getAppPath()}/-/user/${listing.seller}/asset/style`}
                  seed={listing.seller}
                  name={sellerLabel}
                  size={18}
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
