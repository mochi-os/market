// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { Link } from '@tanstack/react-router'
import { APP_ROUTES } from '@/config/routes'
import type { Listing, Photo } from '@/types'
import { Trans } from '@lingui/react/macro'
import {
  Card,
  CardContent,
  EntityAvatar,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  getAppPath,
} from '@mochi/web'
import { BadgeCheck, Download, Package } from 'lucide-react'
import { formatFingerprint } from '@/lib/format'
import { getPreviewUrl } from '@/lib/photos'
import { ConditionBadge } from './condition-badge'
import { PriceDisplay } from './price-display'
import { RatingStars } from './rating-stars'
import { SavedButton } from './saved-button'

interface ListingCardProps {
  listing: Listing
  photo?: Photo
}

function ListingCard({ listing, photo }: ListingCardProps) {
  const sellerLabel = listing.seller
    ? listing.seller_name || formatFingerprint(listing.seller_fingerprint)
    : null

  return (
    <Link
      to={APP_ROUTES.LISTINGS.VIEW(listing.id)}
      preload={false}
      className='group flex h-full flex-col focus-visible:outline-none'
    >
      <Card className='hover:border-primary/40 group-focus-visible:ring-ring/40 flex h-full flex-col overflow-hidden rounded-lg p-0 transition-[border-color,box-shadow] duration-200 ease-out group-focus-visible:ring-2 group-active:scale-[0.99] hover:shadow-md'>
        <div className='bg-muted relative aspect-[4/3] w-full shrink-0 overflow-hidden'>
          {photo ? (
            <img
              src={getPreviewUrl(photo)}
              alt={listing.title}
              loading='lazy'
              className='size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]'
            />
          ) : (
            <div className='from-surface-2 to-muted flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br transition-transform duration-300 ease-out group-hover:scale-[1.04]'>
              <span className='bg-background/60 ring-border inline-flex size-14 items-center justify-center rounded-full ring-1'>
                <Package className='text-muted-foreground/70 size-7' />
              </span>
              <span className='text-muted-foreground/70 text-[11px] font-medium tracking-wider uppercase'>
                <Trans>No image</Trans>
              </span>
            </div>
          )}
          {listing.condition && (
            <div className='absolute top-2 right-2'>
              <ConditionBadge condition={listing.condition} />
            </div>
          )}
          {(listing.pricing !== 'fixed' || listing.my_subscription) && (
            <div className='absolute top-2 left-2 flex flex-col items-start gap-1'>
              {listing.pricing !== 'fixed' && (
                <span className='bg-background/85 ring-border/60 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 backdrop-blur-sm'>
                  {listing.pricing === 'auction' && <Trans>Auction</Trans>}
                  {listing.pricing === 'subscription' && (
                    <Trans>Subscription</Trans>
                  )}
                  {listing.pricing === 'pwyw' && (
                    <Trans>Pay what you want</Trans>
                  )}
                </span>
              )}
              {listing.my_subscription && (
                <span className='inline-flex items-center gap-1 rounded-full bg-green-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm'>
                  <BadgeCheck className='size-3' />
                  <Trans>Subscribed</Trans>
                </span>
              )}
            </div>
          )}
          {listing.type === 'digital' && (
            <div className='absolute bottom-2 left-2'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='bg-background/85 ring-border/60 inline-flex size-6 items-center justify-center rounded-full ring-1 backdrop-blur-sm'>
                    <Download className='text-muted-foreground size-3' />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <Trans>Digital download</Trans>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          <SavedButton listing={listing} />
        </div>
        <CardContent className='flex flex-1 flex-col p-3 sm:p-3.5'>
          <h3 className='group-hover:text-primary line-clamp-2 flex-1 text-xs leading-snug font-medium transition-colors sm:text-sm'>
            {listing.title}
          </h3>
          <div className='mt-auto pt-1.5 sm:pt-2'>
            <div className='text-sm font-semibold tabular-nums sm:text-base'>
              <PriceDisplay listing={listing} />
            </div>
            {sellerLabel && (
              <div className='border-border/60 mt-1.5 border-t pt-1.5 sm:mt-2 sm:pt-2'>
                <p className='text-muted-foreground flex min-w-0 items-center gap-1.5 truncate text-[11px] sm:text-xs'>
                  <EntityAvatar
                    src={`${getAppPath()}/-/user/${listing.seller}/asset/avatar`}
                    styleUrl={`${getAppPath()}/-/user/${listing.seller}/asset/style`}
                    seed={listing.seller}
                    name={sellerLabel}
                    size='xs'
                  />
                  <span className='truncate'>{sellerLabel}</span>
                  {!!listing.seller_onboarded && (
                    <BadgeCheck className='size-3 shrink-0 text-green-600 dark:text-green-400' />
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
