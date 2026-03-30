import { useState, useEffect } from 'react'
import { Link, useLoaderData, useNavigate } from '@tanstack/react-router'
import {
  BadgeCheck,
  Download,
  Edit,
  MessageCircle,
  Package,
  Truck,
  MapPin,
  ShoppingCart,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  GeneralError,
  Main,
  PageHeader,
  toast,
  getErrorMessage,
  usePageTitle,
} from '@mochi/web'
import { formatTimestamp } from '@mochi/web'
import type { Auction, Photo } from '@/types'
import { formatPrice, locationName } from '@/lib/format'
import { getPhotoUrl, getThumbnailUrl } from '@/lib/photos'
import { photosApi } from '@/api/photos'
import { threadsApi } from '@/api/threads'
import { APP_ROUTES } from '@/config/routes'
import { useAccountStore } from '@/stores/account-store'
import { ConditionBadge } from '@/components/shared/condition-badge'
import { PriceDisplay } from '@/components/shared/price-display'
import { RatingStars } from '@/components/shared/rating-stars'
import { StatusBadge } from '@/components/shared/status-badge'

export function ListingPage() {
  const { data, error } = useLoaderData({
    from: '/_authenticated/listings/$listingId',
  })
  const navigate = useNavigate()
  const { account } = useAccountStore()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState(0)

  const listing = data?.listing
  usePageTitle(listing?.title || 'Listing')
  const shipping = data?.shipping ?? []
  const assets = data?.assets ?? []
  const seller = data?.seller
  const auction = data?.auction

  useEffect(() => {
    if (listing) {
      photosApi.list(listing.id).then(setPhotos).catch(() => {})
    }
  }, [listing])

  if (error) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title='Listing' />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!listing) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title='Listing' />
        <Main>
          <EmptyState icon={Package} title='Listing not found' />
        </Main>
      </>
    )
  }

  const isOwner = account?.id === listing.seller
  let tags: string[] = []
  try {
    tags = listing.tags ? JSON.parse(listing.tags) : []
  } catch {
    // ignore malformed tags
  }

  async function handleMessageSeller() {
    if (!listing) return
    try {
      const thread = await threadsApi.create(listing.id)
      navigate({ to: APP_ROUTES.MESSAGE(thread.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create thread'))
    }
  }

  return (
    <>
      <PageHeader
        icon={<Package className='size-4 md:size-5' />}
        title={listing.title}
        back={{ label: 'Back', onFallback: () => navigate({ to: '/' }) }}
        actions={
          isOwner && listing.status === 'draft' ? (
            <Link to={APP_ROUTES.LISTINGS.EDIT(listing.id)}>
              <Button variant='outline' size='sm'>
                <Edit className='size-4' />
                Edit
              </Button>
            </Link>
          ) : undefined
        }
      />
      <Main>
        <div className='grid gap-8 lg:grid-cols-3'>
          <div className='lg:col-span-2 space-y-6'>
            {/* Photo gallery */}
            <div className='space-y-2'>
              <div className='aspect-[4/3] overflow-hidden rounded-[10px] bg-muted'>
                {photos.length > 0 ? (
                  <img
                    src={getPhotoUrl(photos[selectedPhoto] ?? photos[0])}
                    alt={listing.title}
                    className='size-full object-contain'
                  />
                ) : (
                  <div className='flex size-full items-center justify-center'>
                    <Package className='size-16 text-muted-foreground/40' />
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <div className='flex gap-2 overflow-x-auto'>
                  {photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhoto(i)}
                      className={`size-16 shrink-0 overflow-hidden rounded-[10px] border-2 ${
                        i === selectedPhoto
                          ? 'border-primary'
                          : 'border-transparent'
                      }`}
                    >
                      <img
                        src={getThumbnailUrl(photo)}
                        alt=''
                        className='size-full object-cover'
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className='space-y-4'>
              <div className='flex flex-wrap items-center gap-2'>
                {listing.condition && (
                  <ConditionBadge condition={listing.condition} />
                )}
                <StatusBadge status={listing.status} />
                {!!listing.shipping && (
                  <Badge variant='outline'>
                    <Truck className='mr-1 size-3' /> Shipping
                  </Badge>
                )}
                {!!listing.pickup && (
                  <Badge variant='outline'>
                    <MapPin className='mr-1 size-3' /> Pickup
                  </Badge>
                )}
                {listing.type !== 'physical' && (
                  <Badge variant='outline'>
                    <Download className='mr-1 size-3' /> Digital
                  </Badge>
                )}
              </div>

              {listing.description && (
                <div className='prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 whitespace-pre-wrap'>
                  {listing.description}
                </div>
              )}

              {tags.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                  {tags.map((tag) => (
                    <Badge key={tag} variant='secondary'>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {listing.information && (
                <div>
                  <h3 className='mb-1 text-sm font-medium'>
                    Delivery information
                  </h3>
                  <p className='text-sm text-muted-foreground whitespace-pre-wrap'>
                    {listing.information}
                  </p>
                </div>
              )}
            </div>

            {/* Shipping options */}
            {shipping.length > 0 && (
              <div>
                <h3 className='mb-2 text-sm font-medium'>Shipping options</h3>
                <div className='space-y-2'>
                  {shipping.map((opt) => (
                    <div
                      key={opt.id}
                      className='flex items-center justify-between rounded-[10px] border p-3 text-sm'
                    >
                      <span>{opt.region}</span>
                      <div className='flex items-center gap-3'>
                        {opt.days && (
                          <span className='text-muted-foreground'>
                            {opt.days}
                          </span>
                        )}
                        <span className='font-medium'>
                          {formatPrice(opt.price, opt.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assets */}
            {assets.length > 0 && (
              <div>
                <h3 className='mb-2 text-sm font-medium'>Digital assets</h3>
                <div className='space-y-1'>
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className='flex items-center justify-between text-sm'
                    >
                      <span>{asset.filename}</span>
                      <span className='text-muted-foreground'>
                        {(asset.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className='space-y-4'>
            <Card className='rounded-[10px]'>
              <CardContent className='p-4 space-y-4'>
                <div className='text-2xl font-bold'>
                  <PriceDisplay listing={listing} />
                </div>

                {listing.location && (
                  <p className='text-sm text-muted-foreground'>
                    <MapPin className='mr-1 inline size-3' />
                    {locationName(listing.location)}
                  </p>
                )}

                {listing.quantity > 0 && (
                  <p className='text-sm text-muted-foreground'>
                    {listing.quantity} available
                  </p>
                )}

                {listing.created > 0 && (
                  <p className='text-xs text-muted-foreground'>
                    Listed {formatTimestamp(listing.created * 1000)}
                  </p>
                )}

                {/* Auction panel */}
                {auction && <AuctionPanel auction={auction} listing={listing} />}

                {/* Buy actions */}
                {!isOwner && listing.status === 'active' && (
                  <div className='space-y-2'>
                    {listing.pricing !== 'auction' &&
                      listing.pricing !== 'subscription' && (
                        <Link to={APP_ROUTES.CHECKOUT(listing.id)}>
                          <Button className='w-full'>
                            <ShoppingCart className='mr-1 size-4' />
                            Buy now
                          </Button>
                        </Link>
                      )}
                    {listing.pricing === 'subscription' && (
                      <Link to={APP_ROUTES.CHECKOUT(listing.id)}>
                        <Button className='w-full'>Subscribe</Button>
                      </Link>
                    )}
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={handleMessageSeller}
                    >
                      <MessageCircle className='mr-1 size-4' />
                      Message seller
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seller card */}
            {seller && (
              <Link to={APP_ROUTES.PROFILE(seller.id)}>
                <Card className='rounded-[10px] transition-all hover:border-primary/30 hover:shadow-md'>
                  <CardContent className='p-4 space-y-2'>
                    <p className='flex items-center gap-1 font-medium'>
                      {seller.name || 'Anonymous seller'}
                      {!!seller.onboarded && (
                        <BadgeCheck className='size-4 text-green-600 dark:text-green-400' />
                      )}
                    </p>
                    {seller.rating > 0 && (
                      <RatingStars
                        rating={seller.rating}
                        reviews={seller.reviews}
                      />
                    )}
                    {seller.location && (
                      <p className='text-xs text-muted-foreground'>
                        <MapPin className='mr-1 inline size-3' />
                        {locationName(seller.location)}
                      </p>
                    )}
                    <p className='text-xs text-muted-foreground'>
                      {seller.sales} sale{seller.sales !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </Main>
    </>
  )
}

function AuctionPanel({
  auction,
  listing,
}: {
  auction: Auction
  listing: { price: number; currency: string }
}) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const remaining = auction.closes - now

  function formatCountdown(seconds: number): string {
    if (seconds <= 0) return 'Ended'
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
  }

  if (auction.status === 'ended_sold') {
    return (
      <div className='rounded-[10px] bg-green-50 p-3 dark:bg-green-900/20'>
        <p className='text-sm font-medium'>Auction ended</p>
        <p className='text-sm'>
          Sold for {formatPrice(auction.bid, listing.currency)}
        </p>
      </div>
    )
  }

  if (auction.status === 'ended_unsold') {
    return (
      <div className='rounded-[10px] bg-amber-50 p-3 dark:bg-amber-900/20'>
        <p className='text-sm font-medium'>Auction ended</p>
        <p className='text-sm text-muted-foreground'>Reserve not met</p>
      </div>
    )
  }

  if (auction.status === 'scheduled') {
    const opensIn = auction.opens - now
    return (
      <div className='rounded-[10px] bg-blue-50 p-3 dark:bg-blue-900/20'>
        <p className='text-sm font-medium'>Auction opens in</p>
        <p className='text-lg font-mono'>{formatCountdown(opensIn)}</p>
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <div className='rounded-[10px] bg-muted p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>Current bid</span>
          <span className='font-semibold'>
            {auction.bid > 0
              ? formatPrice(auction.bid, listing.currency)
              : formatPrice(listing.price, listing.currency)}
          </span>
        </div>
        <div className='flex items-center justify-between mt-1'>
          <span className='text-sm text-muted-foreground'>Time left</span>
          <span className='font-mono text-sm'>{formatCountdown(remaining)}</span>
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>
          {auction.bids} bid{auction.bids !== 1 ? 's' : ''}
        </p>
      </div>
      {auction.instant > 0 && (
        <p className='text-sm text-muted-foreground'>
          Buy now: {formatPrice(auction.instant, listing.currency)}
        </p>
      )}
    </div>
  )
}
