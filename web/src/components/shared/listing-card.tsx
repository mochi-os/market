import { Link } from '@tanstack/react-router'
import { BadgeCheck, Package } from 'lucide-react'
import { Card, CardContent, EntityAvatar } from '@mochi/web'
import type { Listing, Photo } from '@/types'
import { getThumbnailUrl } from '@/lib/photos'
import { APP_ROUTES } from '@/config/routes'
import { ConditionBadge } from './condition-badge'
import { PriceDisplay } from './price-display'

interface ListingCardProps {
  listing: Listing
  photo?: Photo
}

export function ListingCard({ listing, photo }: ListingCardProps) {
  return (
    <Link to={APP_ROUTES.LISTINGS.VIEW(listing.id)}>
      <Card className='rounded-lg transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md'>
        <div className='aspect-[4/3] w-full overflow-hidden rounded-t-[10px] bg-muted'>
          {photo ? (
            <img
              src={getThumbnailUrl(photo)}
              alt={listing.title}
              className='size-full object-cover'
            />
          ) : (
            <div className='flex size-full items-center justify-center'>
              <Package className='size-12 text-muted-foreground/40' />
            </div>
          )}
        </div>
        <CardContent className='p-4'>
          <h3 className='line-clamp-2 text-sm font-medium'>
            {listing.title}
          </h3>
          <div className='mt-2 flex items-center gap-2'>
            <PriceDisplay listing={listing} />
            {listing.condition && <ConditionBadge condition={listing.condition} />}
          </div>
          {listing.seller_name && (
            <p className='mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground'>
              <EntityAvatar
                fingerprint={listing.seller}
                name={listing.seller_name}
                size={18}
              />
              <span className='truncate'>{listing.seller_name}</span>
              {!!listing.seller_onboarded && (
                <BadgeCheck className='size-3 shrink-0 text-green-600 dark:text-green-400' />
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export function ListingCardFromSearch({ listing }: { listing: Listing }) {
  return <ListingCard listing={listing} photo={listing.photo ?? undefined} />
}
