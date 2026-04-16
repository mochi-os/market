import { useEffect, useState } from 'react'
import { Link, useLoaderData, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  BadgeCheck,
  Download,
  Edit,
  MessageCircle,
  Package,
  RotateCw,
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
  Input,
  Label,
  Main,
  PageHeader,
  Textarea,
  toast,
  getErrorMessage,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Auction, Bid, Listing, Photo } from '@/types'
import { useFormatPrice, locationName } from '@/lib/format'
import { getPhotoUrl, getThumbnailUrl } from '@/lib/photos'
import { bidsApi } from '@/api/auctions'
import { listingsApi } from '@/api/listings'
import { photosApi } from '@/api/photos'
import { APP_ROUTES } from '@/config/routes'
import { useAccountStore } from '@/stores/account-store'
import { ConditionBadge } from '@/components/shared/condition-badge'
import { PriceDisplay } from '@/components/shared/price-display'
import { RatingStars } from '@/components/shared/rating-stars'
import { StatusBadge } from '@/components/shared/status-badge'
import { MessageSheet } from './message-sheet'

export function ListingPage() {
  const { formatTimestamp, formatFileSize } = useFormat()
  const formatPrice = useFormatPrice()
  const { data, error } = useLoaderData({ strict: false }) as {
    data: import('@/api/listings').ListingDetailResponse | null
    error: string | null
  }
  const navigate = useNavigate()
  const { account } = useAccountStore()
  const params = useParams({ strict: false }) as { threadId?: string }
  const search = useSearch({ strict: false }) as { messages?: boolean; thread?: number }
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState(0)

  const listing = data?.listing
  usePageTitle(listing?.title || 'Listing')
  const shipping = data?.shipping ?? []
  const assets = data?.assets ?? []
  const seller = data?.seller
  const auction = data?.auction
  const routeThreadId = params.threadId ? Number(params.threadId) : search.thread
  const [messageOpen, setMessageOpen] = useState(!!routeThreadId || search.messages === true)

  useEffect(() => {
    if (listing) {
      photosApi.list(listing.id).then(setPhotos).catch((err) => {
        console.error('Failed to load photos:', err)
      })
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

  function handleMessageSeller() {
    setMessageOpen(true)
  }

  const [relisting, setRelisting] = useState(false)
  async function handleRelist() {
    if (!listing) return
    setRelisting(true)
    try {
      const result = await listingsApi.relist(listing.id)
      if (result.auction) {
        const durationSeconds = result.auction.closes - result.auction.opens
        const durationDays = Math.max(1, Math.round(durationSeconds / 86400))
        sessionStorage.setItem(
          `relist:${result.listing.id}`,
          JSON.stringify({
            reserve: result.auction.reserve,
            instant: result.auction.instant,
            duration: String(durationDays),
          }),
        )
      }
      toast.success('Listing copied as draft')
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(result.listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to relist'))
    } finally {
      setRelisting(false)
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
          ) : isOwner && (listing.status === 'expired' || listing.status === 'sold') ? (
            <Button variant='outline' size='sm' onClick={handleRelist} disabled={relisting}>
              <RotateCw className='size-4' />
              {relisting ? 'Relisting...' : 'Relist'}
            </Button>
          ) : undefined
        }
      />
      <Main>
        <div className={`grid gap-8 ${photos.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-[20rem_1fr]'}`}>
          <div className={`${photos.length > 0 ? 'lg:col-span-2' : 'lg:order-2'} space-y-6`}>
            {/* Photo gallery */}
            {photos.length > 0 && (
              <div className='space-y-2'>
                <div className='aspect-[4/3] overflow-hidden rounded-[10px] bg-muted'>
                  <img
                    src={getPhotoUrl(photos[selectedPhoto] ?? photos[0])}
                    alt={listing.title}
                    className='size-full object-contain'
                  />
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
                {/* Preload full-size photos */}
                <div className='hidden'>
                  {photos.map((photo) => (
                    <img key={photo.id} src={getPhotoUrl(photo)} alt='' />
                  ))}
                </div>
              </div>
            )}

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
                            {opt.days} days
                          </span>
                        )}
                        <span className='font-medium'>
                          {formatPrice(opt.price, opt.currency || listing.currency)}
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
                        {formatFileSize(asset.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className={`space-y-4 ${photos.length === 0 ? 'lg:order-1' : ''}`}>
            {isOwner && listing.moderation === 'rejected' && (
              <RejectionCard listing={listing} />
            )}
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
                    Listed {formatTimestamp(listing.created)}
                  </p>
                )}

                {/* Auction panel */}
                {auction && <AuctionPanel auction={auction} listing={listing} isOwner={isOwner} myOrder={data?.my_order ?? null} bids={data?.bids ?? []} />}

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
                {isOwner && (data?.threads ?? 0) > 0 && (
                  <Link to={APP_ROUTES.MESSAGES}>
                    <Button variant='outline' className='w-full'>
                      <MessageCircle className='mr-1 size-4' />
                      Messages ({data.threads})
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Seller card */}
            {seller && (
              <Link to={APP_ROUTES.PROFILE(seller.id)}>
                <Card className='rounded-[10px] transition-all hover:border-primary/30 hover:shadow-md'>
                  <CardContent className='p-4 space-y-2'>
                    <p className='text-xs text-muted-foreground'>Seller</p>
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
      <MessageSheet
        listingId={listing.id}
        listingTitle={listing.title}
        threadId={routeThreadId}
        open={messageOpen}
        onOpenChange={setMessageOpen}
      />
    </>
  )
}

function AuctionPanel({
  auction,
  listing,
  isOwner,
  myOrder,
  bids,
}: {
  auction: Auction
  listing: { id: number; price: number; currency: string }
  isOwner: boolean
  myOrder: { id: number; status: string } | null
  bids: Bid[]
}) {
  const navigate = useNavigate()
  const formatPrice = useFormatPrice()
  const { formatTimestamp } = useFormat()
  const { account } = useAccountStore()
  const isWinner = account?.id === auction.bidder
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))
  const [bidAmount, setBidAmount] = useState('')
  const [bidding, setBidding] = useState(false)

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

  const currentBid = auction.bid > 0 ? auction.bid : listing.price
  const minBid = auction.bid > 0 ? auction.bid + 1 : listing.price

  async function handleBid() {
    const amount = Math.round(Number(bidAmount) * 100)
    if (amount < minBid) {
      toast.error(`Bid must be at least ${formatPrice(minBid, listing.currency)}`)
      return
    }
    setBidding(true)
    try {
      const result = await bidsApi.place({ auction: auction.id, amount })
      if (result.outbid) {
        toast.error('You were outbid — try a higher amount')
      } else {
        toast.success('Bid placed')
        setBidAmount('')
        window.location.reload()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to place bid'))
    } finally {
      setBidding(false)
    }
  }

  if (auction.status === 'ended_sold') {
    return (
      <div className='space-y-3'>
        <div className='rounded-[10px] bg-green-50 p-3 dark:bg-green-900/20'>
          <p className='text-sm font-medium'>
            {isWinner ? 'You won this auction' : 'Auction ended'}
          </p>
          <p className='text-sm'>
            Sold for {formatPrice(auction.bid, listing.currency)}
          </p>
          {isOwner && (
            <p className='mt-1 text-xs text-muted-foreground'>
              Waiting for buyer to complete payment
            </p>
          )}
        </div>
        {isWinner && myOrder ? (
          <Link to={APP_ROUTES.PURCHASE(myOrder.id)}>
            <Button className='w-full' variant='outline'>View your order</Button>
          </Link>
        ) : isWinner ? (
          <Link to={APP_ROUTES.CHECKOUT(listing.id)}>
            <Button className='w-full'>Complete purchase</Button>
          </Link>
        ) : null}
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

  if (auction.status === 'payment_overdue') {
    return (
      <div className='rounded-[10px] bg-red-50 p-3 dark:bg-red-900/20'>
        <p className='text-sm font-medium'>Auction ended — buyer did not pay</p>
        {isOwner && (
          <p className='mt-1 text-xs text-muted-foreground'>
            You can relist this item
          </p>
        )}
      </div>
    )
  }

  if (auction.status === 'scheduled') {
    const opensIn = auction.opens - now
    return (
      <div className='rounded-[10px] bg-primary/5 p-3 dark:bg-primary/10'>
        <p className='text-sm font-medium'>Auction opens in</p>
        <p className='text-lg font-mono'>{formatCountdown(opensIn)}</p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='rounded-[10px] bg-muted p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>Current bid</span>
          <span className='font-semibold'>
            {formatPrice(currentBid, listing.currency)}
          </span>
        </div>
        <div className='flex items-center justify-between mt-1'>
          <span className='text-sm text-muted-foreground'>Time left</span>
          <span className='font-mono text-sm'>{formatCountdown(remaining)}</span>
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>
          {auction.bids} bid{auction.bids !== 1 ? 's' : ''}
          {auction.has_reserve && (auction.reserve_met ? ' · reserve met' : ' · reserve not yet met')}
        </p>
        {bids.length > 0 && (
          <details className='mt-2'>
            <summary className='cursor-pointer text-xs text-muted-foreground hover:text-foreground'>
              Bid history
            </summary>
            <ul className='mt-2 space-y-1 text-xs'>
              {bids.map((b) => (
                <li key={b.id} className='flex justify-between gap-2'>
                  <span className='truncate font-mono text-muted-foreground'>
                    {b.bidder.slice(0, 9)}
                  </span>
                  <span className='shrink-0'>
                    {formatPrice(b.amount, listing.currency)}
                  </span>
                  <span className='shrink-0 text-muted-foreground'>
                    {formatTimestamp(b.created)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {!isOwner && remaining > 0 && (
        <div className='space-y-2'>
          <div>
            <Label htmlFor='bidAmount'>
              Your bid (minimum {formatPrice(minBid, listing.currency)})
            </Label>
            <Input
              id='bidAmount'
              inputMode='decimal'
              value={bidAmount}
              onChange={(e) => {
                const val = e.target.value
                if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return
                setBidAmount(val)
              }}
            />
          </div>
          <Button className='w-full' onClick={handleBid} disabled={bidding || !bidAmount}>
            {bidding ? 'Placing bid...' : 'Place bid'}
          </Button>
          {auction.instant > 0 && (
            <Button
              variant='outline'
              className='w-full'
              disabled={bidding}
              onClick={async () => {
                setBidding(true)
                try {
                  const result = await bidsApi.place({ auction: auction.id, amount: auction.instant })
                  if (result.instant) {
                    toast.success('Purchase confirmed — complete payment')
                    navigate({ to: APP_ROUTES.CHECKOUT(listing.id) })
                  }
                } catch (err) {
                  toast.error(getErrorMessage(err, 'Failed to buy'))
                } finally {
                  setBidding(false)
                }
              }}
            >
              Buy it now — {formatPrice(auction.instant, listing.currency)}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function RejectionCard({ listing }: { listing: Listing }) {
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleAppeal() {
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      await listingsApi.appeal(listing.id, reason)
      toast.success('Appeal submitted')
      setSubmitted(true)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit appeal'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className='rounded-[10px] border-red-200 dark:border-red-900'>
      <CardContent className='p-4 space-y-3'>
        <p className='text-sm font-medium text-red-700 dark:text-red-400'>
          This listing was rejected
        </p>
        {listing.notes && (
          <p className='text-sm text-muted-foreground'>{listing.notes}</p>
        )}
        {submitted ? (
          <p className='text-sm text-muted-foreground'>Appeal submitted</p>
        ) : (
          <>
            <Textarea
              placeholder='Why should this listing be reconsidered?'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              size='sm'
              onClick={handleAppeal}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit appeal'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
