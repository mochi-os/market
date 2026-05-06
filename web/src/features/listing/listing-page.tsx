import { useEffect, useRef, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { Link, useLoaderData, useNavigate, useParams, useRouter, useSearch } from '@tanstack/react-router'
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Flag,
  LoaderCircle,
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
  ConfirmDialog,
  EmptyState,
  EntityAvatar,
  GeneralError,
  Input,
  Label,
  Main,
  PageHeader,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
  getErrorMessage,
  usePageTitle,
  useFormat,
  useAuthStore,
  getAppPath,
  shellNavigateTop,
} from '@mochi/web'
import type { Auction, Bid, Listing, Photo } from '@/types'
import { useFormatPrice, locationName, toMinorUnits, currencyDecimals, safeJsonParse } from '@/lib/format'
import { getPhotoUrl, getThumbnailUrl } from '@/lib/photos'
import { bidsApi } from '@/api/auctions'
import { listingsApi } from '@/api/listings'
import { photosApi } from '@/api/photos'
import { reportsApi } from '@/api/reports'
import { useReportReasons } from '@/config/constants'
import { addRecentlyViewed } from '@/lib/recently-viewed'
import { APP_ROUTES } from '@/config/routes'
import { useAccountStore } from '@/stores/account-store'
import { AuditTimeline } from '@/components/shared/audit-timeline'
import { ConditionBadge } from '@/components/shared/condition-badge'
import { PriceDisplay } from '@/components/shared/price-display'
import { RatingStars } from '@/components/shared/rating-stars'
import { StatusBadge } from '@/components/shared/status-badge'
import { MessageSheet } from './message-sheet'

export function ListingPage() {
  const { t } = useLingui()
  const { formatTimestamp, formatFileSize } = useFormat()
  const formatPrice = useFormatPrice()
  const REPORT_REASONS = useReportReasons()
  const { data, error } = useLoaderData({ strict: false }) as {
    data: import('@/api/listings').ListingDetailResponse | null
    error: string | null
  }
  const navigate = useNavigate()
  const { account } = useAccountStore()
  const isLoggedIn = useAuthStore((s) => s.isAuthenticated)
  const params = useParams({ strict: false }) as { threadId?: string }
  const search = useSearch({ strict: false }) as { messages?: boolean; thread?: number }
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [mainPhotoLoading, setMainPhotoLoading] = useState(false)

  const goToPhoto = (i: number) => {
    if (i === selectedPhoto || i < 0 || i >= photos.length) return
    setMainPhotoLoading(true)
    setSelectedPhoto(i)
  }
  const prevPhoto = () => goToPhoto((selectedPhoto - 1 + photos.length) % photos.length)
  const nextPhoto = () => goToPhoto((selectedPhoto + 1) % photos.length)

  const listing = data?.listing
  usePageTitle(listing?.title || t`Listing`)
  const shipping = data?.shipping ?? []
  const assets = data?.assets ?? []
  const seller = data?.seller
  const auction = data?.auction
  const routeThreadId = params.threadId ? Number(params.threadId) : search.thread
  const [messageOpen, setMessageOpen] = useState(!!routeThreadId || search.messages === true)
  const [relisting, setRelisting] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('prohibited')
  const [reportDetails, setReportDetails] = useState('')
  const [reporting, setReporting] = useState(false)

  const savedRef = useRef<number | null>(null)
  useEffect(() => {
    if (listing && listing.id !== savedRef.current) {
      savedRef.current = listing.id
      addRecentlyViewed(listing)
    }
  }, [listing])

  useEffect(() => {
    if (photos.length < 2) return
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      )
        return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setMainPhotoLoading(true)
        setSelectedPhoto((s) => (s - 1 + photos.length) % photos.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setMainPhotoLoading(true)
        setSelectedPhoto((s) => (s + 1) % photos.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length])

  useEffect(() => {
    if (listing) {
      setPhotosLoaded(false)
      photosApi
        .list(listing.id)
        .then(setPhotos)
        .catch((err) => {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console -- dev-only diagnostic
            console.error('Failed to load photos:', err)
          }
        })
        .finally(() => setPhotosLoaded(true))
    }
  }, [listing])

  if (error) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title={t`Listing`} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!listing) {
    return (
      <>
        <PageHeader icon={<Package className='size-4 md:size-5' />} title={t`Listing`} />
        <Main>
          <EmptyState icon={Package} title={t`Listing not found`} />
        </Main>
      </>
    )
  }

  const isOwner = account?.id === listing.seller
  const tags = safeJsonParse<string[]>(listing.tags, [])

  function handleMessageSeller() {
    setMessageOpen(true)
  }

  async function handleReport() {
    if (!listing) return
    setReporting(true)
    try {
      await reportsApi.create({
        target: String(listing.id),
        type: 'listing',
        reason: reportReason,
        details: reportDetails,
      })
      toast.success(t`Report submitted`)
      setReportOpen(false)
      setReportDetails('')
      setReportReason('prohibited')
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to submit report`))
    } finally {
      setReporting(false)
    }
  }

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
      toast.success(t`Listing copied as draft`)
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(result.listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to relist`))
    } finally {
      setRelisting(false)
    }
  }

  return (
    <>
      <PageHeader
        icon={<Package className='size-4 md:size-5' />}
        title={listing.title}
        back={{ label: t`Back`, onFallback: () => navigate({ to: '/' }) }}
        actions={
          isOwner && listing.status === 'draft' ? (
            <Link to={APP_ROUTES.LISTINGS.EDIT(listing.id)}>
              <Button variant='outline' size='sm'>
                <Edit className='size-4' />
                <Trans>Edit</Trans>
              </Button>
            </Link>
          ) : isOwner && (listing.status === 'expired' || listing.status === 'sold') ? (
            <Button variant='outline' size='sm' onClick={handleRelist} disabled={relisting}>
              <RotateCw className='size-4' />
              {relisting ? t`Relisting...` : t`Relist`}
            </Button>
          ) : undefined
        }
      />
      <Main>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8'>
          <div className='min-w-0 space-y-6 lg:col-span-2'>
            {/* Photo gallery */}
            {!photosLoaded ? (
              <div className='space-y-2'>
                <Skeleton className='h-[min(60vw,26rem)] w-full rounded-lg lg:h-[26rem]' />
                <div className='flex gap-2'>
                  <Skeleton className='size-14 rounded-lg sm:size-16' />
                  <Skeleton className='size-14 rounded-lg sm:size-16' />
                  <Skeleton className='size-14 rounded-lg sm:size-16' />
                </div>
              </div>
            ) : photos.length > 0 ? (
              <div className='space-y-2'>
                <div className='group relative h-[min(60vw,26rem)] overflow-hidden rounded-lg bg-muted lg:h-[26rem]'>
                  {/* Low-res thumbnail underlay shown instantly while full res loads */}
                  <img
                    key={`thumb-${photos[selectedPhoto]?.id ?? photos[0].id}`}
                    src={getThumbnailUrl(photos[selectedPhoto] ?? photos[0])}
                    alt=''
                    aria-hidden
                    className='absolute inset-0 size-full scale-105 object-contain blur-md'
                  />
                  <img
                    key={`full-${photos[selectedPhoto]?.id ?? photos[0].id}`}
                    src={getPhotoUrl(photos[selectedPhoto] ?? photos[0])}
                    alt={listing.title}
                    onLoad={() => setMainPhotoLoading(false)}
                    onError={() => setMainPhotoLoading(false)}
                    className={`relative size-full object-contain transition-opacity duration-200 ease-out ${
                      mainPhotoLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                  {mainPhotoLoading && (
                    <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                      <span className='inline-flex size-10 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-sm'>
                        <LoaderCircle className='size-5 animate-spin text-primary' />
                      </span>
                    </div>
                  )}

                  {photos.length > 1 && (
                    <>
                      <button
                        type='button'
                        aria-label={t`Previous photo`}
                        onClick={prevPhoto}
                        className='absolute left-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur-sm transition-all duration-150 ease-out hover:bg-background hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100'
                      >
                        <ChevronLeft className='size-5' />
                      </button>
                      <button
                        type='button'
                        aria-label={t`Next photo`}
                        onClick={nextPhoto}
                        className='absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur-sm transition-all duration-150 ease-out hover:bg-background hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100'
                      >
                        <ChevronRight className='size-5' />
                      </button>
                      <div className='absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium tabular-nums shadow-sm backdrop-blur-sm'>
                        {selectedPhoto + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className='flex gap-2 overflow-x-auto pb-1'>
                    {photos.map((photo, i) => (
                      <button
                        key={photo.id}
                        type='button'
                        aria-label={t`View photo ${i + 1}`}
                        onClick={() => goToPhoto(i)}
                        className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:size-16 ${
                          i === selectedPhoto
                            ? 'border-primary'
                            : 'border-transparent opacity-70 hover:opacity-100 hover:border-border-strong'
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
            ) : (
              <div className='flex h-[min(60vw,26rem)] w-full flex-col items-center justify-center gap-3 rounded-lg bg-gradient-to-br from-surface-2 to-muted lg:h-[26rem]'>
                <span className='inline-flex size-16 items-center justify-center rounded-full bg-background/60 ring-1 ring-border'>
                  {listing.type === 'digital' ? (
                    <Download className='size-8 text-muted-foreground/70' />
                  ) : (
                    <Package className='size-8 text-muted-foreground/70' />
                  )}
                </span>
                <span className='text-xs font-medium uppercase tracking-wider text-muted-foreground/70'>
                  {listing.type === 'digital'
                    ? <Trans>Digital item — no preview</Trans>
                    : <Trans>No image</Trans>}
                </span>
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
                    <Truck className='me-1 size-3' /> <Trans>Shipping</Trans>
                  </Badge>
                )}
                {!!listing.pickup && (
                  <Badge variant='outline'>
                    <MapPin className='me-1 size-3' /> <Trans>Pickup</Trans>
                  </Badge>
                )}
                {listing.type !== 'physical' && (
                  <Badge variant='outline'>
                    <Download className='me-1 size-3' /> <Trans>Digital</Trans>
                  </Badge>
                )}
              </div>

              {listing.description && (
                <div className='prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-ul:my-3 prose-ul:list-disc prose-ul:ps-6 prose-ol:my-3 prose-ol:list-decimal prose-ol:ps-6 prose-li:my-1 whitespace-pre-wrap'>
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
                    <Trans>Delivery information</Trans>
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
                <h3 className='mb-2 text-sm font-medium'><Trans>Shipping options</Trans></h3>
                <div className='space-y-2'>
                  {shipping.map((opt) => (
                    <div
                      key={opt.id}
                      className='flex items-center justify-between rounded-lg border p-3 text-sm'
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
                <h3 className='mb-2 text-sm font-medium'><Trans>Digital assets</Trans></h3>
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
          <div className='min-w-0 space-y-4 lg:sticky lg:top-[calc(var(--sticky-top,0px)+4rem)] lg:max-h-[calc(100vh-var(--sticky-top,0px)-5rem)] lg:self-start lg:overflow-y-auto lg:pr-1'>
            {isOwner &&
              (listing.moderation === 'rejected' ||
                listing.moderation === 'hold') && (
                <RejectionCard
                  listing={listing}
                  appealPending={data?.appeal_pending ?? false}
                />
              )}
            {isOwner &&
              listing.moderation === 'manual' &&
              listing.notes && <ApprovalCard listing={listing} />}
            {isOwner &&
              data?.warnings &&
              data.warnings.length > 0 && (
                <WarningCard warnings={data.warnings} />
              )}
            <Card className='rounded-lg'>
              <CardContent className='p-4 space-y-4'>
                <div className='space-y-1'>
                  <h2 className='text-lg font-semibold leading-snug'>
                    {listing.title}
                  </h2>
                  <div className='text-2xl font-bold tabular-nums'>
                    <PriceDisplay listing={listing} />
                  </div>
                </div>

                {listing.location && (
                  <p className='text-sm text-muted-foreground'>
                    <MapPin className='me-1 inline size-3' />
                    {locationName(listing.location)}
                  </p>
                )}

                {listing.quantity > 0 && (
                  <p className='text-sm text-muted-foreground'>
                    <Plural value={listing.quantity} one='# available' other='# available' />
                  </p>
                )}

                {listing.created > 0 && (
                  <p className='text-xs text-muted-foreground'>
                    <Trans>Listed {formatTimestamp(listing.created)}</Trans>
                  </p>
                )}

                {/* Auction panel */}
                {auction && <AuctionPanel auction={auction} listing={listing} isOwner={isOwner} myOrder={data?.my_order ?? null} bids={data?.bids ?? []} sellerActive={seller?.status === 'active' || !seller?.status} />}

                {/* Seller is not currently transacting */}
                {!isOwner &&
                  listing.status === 'active' &&
                  seller?.status &&
                  seller.status !== 'active' && (
                    <p className='text-sm text-muted-foreground'>
                      <Trans>This seller is not currently accepting new orders.</Trans>
                    </p>
                  )}

                {/* Buy actions. The reserving buyer's view stays buyable even after
                    inventory hits 0 and the listing flips to 'sold' — their own
                    drop_reservations on retry releases inventory and opens a fresh
                    Stripe Checkout. */}
                {!isOwner && listing.status === 'active' && !isLoggedIn && listing.pricing !== 'auction' && (
                  <Button
                    className='w-full'
                    onClick={() => shellNavigateTop('/')}
                  >
                    {listing.pricing === 'subscription'
                      ? <Trans>Log in to subscribe</Trans>
                      : <Trans>Log in to buy</Trans>}
                  </Button>
                )}
                {!isOwner && (listing.status === 'active' || !!data?.my_reservation) && isLoggedIn && (
                  <div className='space-y-2'>
                    {data?.my_reservation && (
                      <p className='text-sm text-muted-foreground'>
                        <Trans>You have a checkout in progress for this listing.</Trans>
                      </p>
                    )}
                    {(!seller?.status || seller.status === 'active') &&
                      listing.pricing !== 'auction' &&
                      listing.pricing !== 'subscription' && (
                        <Link to={APP_ROUTES.CHECKOUT(listing.id)}>
                          <Button className='w-full'>
                            <ShoppingCart className='me-1 size-4' />
                            {data?.my_reservation ? <Trans>Complete purchase</Trans> : <Trans>Buy now</Trans>}
                          </Button>
                        </Link>
                      )}
                    {(!seller?.status || seller.status === 'active') &&
                      listing.pricing === 'subscription' && (
                        <Link to={APP_ROUTES.CHECKOUT(listing.id)}>
                          <Button className='w-full'><Trans>Subscribe</Trans></Button>
                        </Link>
                      )}
                    <Button
                      variant='outline'
                      className={`w-full ${(!seller?.status || seller.status === 'active') ? 'mt-4' : ''}`}
                      onClick={handleMessageSeller}
                    >
                      <MessageCircle className='me-1 size-4' />
                      <Trans>Message seller</Trans>
                    </Button>
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={() => setReportOpen(true)}
                    >
                      <Flag className='me-1 size-4' />
                      <Trans>Report this listing</Trans>
                    </Button>
                  </div>
                )}
                {isOwner && (data?.threads ?? 0) > 0 && (
                  <Link to={APP_ROUTES.MESSAGES}>
                    <Button variant='outline' className='w-full'>
                      <MessageCircle className='me-1 size-4' />
                      <Trans>Messages ({data.threads})</Trans>
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Seller card */}
            {seller && (
              <Link to={APP_ROUTES.PROFILE(seller.id)}>
                <Card className='rounded-lg transition-all hover:border-primary/30 hover:shadow-md'>
                  <CardContent className='p-4 space-y-2'>
                    <p className='text-xs text-muted-foreground'><Trans>Seller</Trans></p>
                    <p className='flex items-center gap-2 font-medium'>
                      <EntityAvatar
                        src={`${getAppPath()}/-/user/${seller.id}/asset/avatar`}
                        styleUrl={`${getAppPath()}/-/user/${seller.id}/asset/style`}
                        seed={seller.id}
                        name={seller.name || t`Anonymous seller`}
                        size="md"
                      />
                      <span className='flex items-center gap-1'>
                        {seller.name || t`Anonymous seller`}
                        {!!seller.onboarded && (
                          <BadgeCheck className='size-4 text-green-600 dark:text-green-400' />
                        )}
                      </span>
                    </p>
                    {seller.rating > 0 && (
                      <RatingStars
                        rating={seller.rating}
                        reviews={seller.reviews}
                      />
                    )}
                    {seller.location && (
                      <p className='text-xs text-muted-foreground'>
                        <MapPin className='me-1 inline size-3' />
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

            {isOwner && <AuditTimeline kind='listing' object={listing.id} />}
          </div>
        </div>

        <ConfirmDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          title={t`Report listing`}
          desc=''
          handleConfirm={handleReport}
          confirmText={t`Submit report`}
          destructive
          isLoading={reporting}
        >
          <div className='space-y-3'>
            <div>
              <Label><Trans>Reason</Trans></Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor='reportDetails'><Trans>Details</Trans></Label>
              <Textarea
                id='reportDetails'
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ConfirmDialog>
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
  sellerActive,
}: {
  auction: Auction
  listing: { id: number; price: number; currency: string }
  isOwner: boolean
  myOrder: { id: number; status: string } | null
  bids: Bid[]
  sellerActive: boolean
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const router = useRouter()
  const formatPrice = useFormatPrice()
  const { formatTimestamp } = useFormat()
  const isLoggedIn = useAuthStore((s) => s.isAuthenticated)
  const isWinner = !!auction.mine
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))
  const [bidAmount, setBidAmount] = useState('')
  const [ceilingAmount, setCeilingAmount] = useState('')
  const [bidding, setBidding] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const remaining = auction.closes - now

  function formatCountdown(seconds: number): string {
    if (seconds <= 0) return t`Ended`
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (d > 0) return t`${d}d ${h}h ${m}m`
    if (h > 0) return t`${h}h ${m}m ${s}s`
    return t`${m}m ${s}s`
  }

  const currentBid = auction.bid > 0 ? auction.bid : listing.price
  const minBid = auction.bid > 0 ? auction.bid + 1 : listing.price

  async function handleBid() {
    const amount = toMinorUnits(bidAmount, listing.currency)
    if (amount < minBid) {
      toast.error(t`Bid must be at least ${formatPrice(minBid, listing.currency)}`)
      return
    }
    const ceiling = ceilingAmount ? toMinorUnits(ceilingAmount, listing.currency) : 0
    if (ceiling > 0 && ceiling < amount) {
      toast.error(t`Maximum bid must be at least your bid amount`)
      return
    }
    setBidding(true)
    try {
      const result = await bidsApi.place({ auction: auction.id, amount, ceiling })
      if (result.outbid) {
        toast.error(t`You were outbid — try a higher amount`)
      } else {
        toast.success(t`Bid placed`)
        setBidAmount('')
        setCeilingAmount('')
        await router.invalidate()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to place bid`))
    } finally {
      setBidding(false)
    }
  }

  if (auction.status === 'ended_sold') {
    return (
      <div className='space-y-3'>
        <div className='rounded-lg bg-green-50 p-3 dark:bg-green-900/20'>
          <p className='text-sm font-medium'>
            {isWinner ? t`You won this auction` : t`Auction ended`}
          </p>
          <p className='text-sm'>
            <Trans>Sold for {formatPrice(auction.bid, listing.currency)}</Trans>
          </p>
          {isOwner && (
            <p className='mt-1 text-xs text-muted-foreground'>
              <Trans>Waiting for buyer to complete payment</Trans>
            </p>
          )}
        </div>
        {isWinner && myOrder ? (
          <Link to={APP_ROUTES.PURCHASE(myOrder.id)}>
            <Button className='w-full' variant='outline'><Trans>View your order</Trans></Button>
          </Link>
        ) : isWinner ? (
          <Link to={APP_ROUTES.CHECKOUT(listing.id)}>
            <Button className='w-full'><Trans>Complete purchase</Trans></Button>
          </Link>
        ) : null}
      </div>
    )
  }

  if (auction.status === 'ended_unsold') {
    return (
      <div className='rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20'>
        <p className='text-sm font-medium'><Trans>Auction ended</Trans></p>
        <p className='text-sm text-muted-foreground'><Trans>Reserve not met</Trans></p>
      </div>
    )
  }

  if (auction.status === 'payment_overdue') {
    return (
      <div className='rounded-lg bg-red-50 p-3 dark:bg-red-900/20'>
        <p className='text-sm font-medium'><Trans>Auction ended — buyer did not pay</Trans></p>
        {isOwner && (
          <p className='mt-1 text-xs text-muted-foreground'>
            <Trans>You can relist this item</Trans>
          </p>
        )}
      </div>
    )
  }

  if (auction.status === 'scheduled') {
    const opensIn = auction.opens - now
    if (opensIn <= 0) {
      return (
        <div className='rounded-lg bg-primary/5 p-3 dark:bg-primary/10'>
          <p className='text-sm font-medium'><Trans>Auction is opening…</Trans></p>
          <Button
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() => router.invalidate()}
          >
            <Trans>Refresh</Trans>
          </Button>
        </div>
      )
    }
    return (
      <div className='rounded-lg bg-primary/5 p-3 dark:bg-primary/10'>
        <p className='text-sm font-medium'><Trans>Auction opens in</Trans></p>
        <p className='text-lg font-mono'>{formatCountdown(opensIn)}</p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='rounded-lg bg-muted p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'><Trans>Current bid</Trans></span>
          <span className='font-semibold'>
            {formatPrice(currentBid, listing.currency)}
          </span>
        </div>
        <div className='flex items-center justify-between mt-1'>
          <span className='text-sm text-muted-foreground'><Trans>Time left</Trans></span>
          <span className='font-mono text-sm'>{formatCountdown(remaining)}</span>
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>
          <Plural value={auction.bids} one='# bid' other='# bids' />
          {auction.has_reserve && (auction.reserve_met ? ' · ' + t`reserve met` : ' · ' + t`reserve not yet met`)}
        </p>
        {bids.length > 0 && (
          <details className='mt-2'>
            <summary className='cursor-pointer text-xs text-muted-foreground hover:text-foreground'>
              <Trans>Bid history</Trans>
            </summary>
            <ul className='mt-2 space-y-1 text-xs'>
              {bids.map((b) => (
                <li key={b.id} className='flex justify-between gap-2'>
                  <span className='shrink-0 text-muted-foreground'>
                    {b.mine ? t`Your bid` : ''}
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
      {!isOwner && remaining > 0 && !sellerActive && (
        <p className='text-sm text-muted-foreground'>
          <Trans>This seller is not currently accepting new bids.</Trans>
        </p>
      )}
      {!isOwner && remaining > 0 && sellerActive && !isLoggedIn && (
        <Button
          className='w-full'
          onClick={() => shellNavigateTop('/')}
        >
          <Trans>Log in to bid</Trans>
        </Button>
      )}
      {!isOwner && remaining > 0 && sellerActive && isLoggedIn && (() => {
        const dec = currencyDecimals(listing.currency)
        const re = dec === 0 ? /^\d*$/ : new RegExp(`^\\d*\\.?\\d{0,${dec}}$`)
        return (
        <div className='space-y-2'>
          <div>
            <Label htmlFor='bidAmount'>
              <Trans>Your bid (minimum {formatPrice(minBid, listing.currency)})</Trans>
            </Label>
            <Input
              id='bidAmount'
              inputMode={dec === 0 ? 'numeric' : 'decimal'}
              value={bidAmount}
              onChange={(e) => {
                const val = e.target.value
                if (val !== '' && !re.test(val)) return
                setBidAmount(val)
              }}
            />
          </div>
          <div>
            <Label htmlFor='ceilingAmount'><Trans>Maximum bid (optional)</Trans></Label>
            <Input
              id='ceilingAmount'
              inputMode={dec === 0 ? 'numeric' : 'decimal'}
              value={ceilingAmount}
              onChange={(e) => {
                const val = e.target.value
                if (val !== '' && !re.test(val)) return
                setCeilingAmount(val)
              }}
            />
            <p className='mt-1 text-xs text-muted-foreground'>
              <Trans>We'll bid up to this amount on your behalf, only as much as needed to stay ahead.</Trans>
            </p>
          </div>
          <Button className='w-full' onClick={handleBid} disabled={bidding || !bidAmount}>
            {bidding ? t`Placing bid...` : t`Place bid`}
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
                    toast.success(t`Purchase confirmed — complete payment`)
                    navigate({ to: APP_ROUTES.CHECKOUT(listing.id) })
                  }
                } catch (err) {
                  toast.error(getErrorMessage(err, t`Failed to buy`))
                } finally {
                  setBidding(false)
                }
              }}
            >
              <Trans>Buy it now — {formatPrice(auction.instant, listing.currency)}</Trans>
            </Button>
          )}
        </div>
        )
      })()}
    </div>
  )
}

function RejectionCard({
  listing,
  appealPending,
}: {
  listing: Listing
  appealPending: boolean
}) {
  const { t } = useLingui()
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(appealPending)
  const [submitting, setSubmitting] = useState(false)

  async function handleAppeal() {
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      await listingsApi.appeal(listing.id, reason)
      toast.success(t`Appeal submitted`)
      setSubmitted(true)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to submit appeal`))
    } finally {
      setSubmitting(false)
    }
  }

  const onHold = listing.moderation === 'hold'
  const headline = onHold
    ? t`This listing is on hold pending review`
    : t`This listing was rejected`

  return (
    <Card className='rounded-lg border-red-200 dark:border-red-900'>
      <CardContent className='p-4 space-y-3'>
        <p className='text-sm font-medium text-red-700 dark:text-red-400'>
          {headline}
        </p>
        {listing.notes && (
          <p className='text-sm text-muted-foreground'>{listing.notes}</p>
        )}
        {submitted ? (
          <p className='text-sm text-muted-foreground'><Trans>Appeal submitted</Trans></p>
        ) : (
          <>
            <Textarea
              placeholder={t`Why should this listing be reconsidered?`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              size='sm'
              onClick={handleAppeal}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? t`Submitting...` : t`Submit appeal`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ApprovalCard({ listing }: { listing: Listing }) {
  return (
    <Card className='rounded-lg border-green-200 dark:border-green-900'>
      <CardContent className='p-4 space-y-2'>
        <p className='text-sm font-medium text-green-700 dark:text-green-400'>
          <Trans>Approved by staff</Trans>
        </p>
        <p className='text-sm whitespace-pre-wrap text-muted-foreground'>
          {listing.notes}
        </p>
      </CardContent>
    </Card>
  )
}

function WarningCard({
  warnings,
}: {
  warnings: Array<{ reason: string; created: number }>
}) {
  return (
    <Card className='rounded-lg border-amber-200 dark:border-amber-900'>
      <CardContent className='p-4 space-y-2'>
        <p className='text-sm font-medium text-amber-700 dark:text-amber-400'>
          <Plural value={warnings.length} one='Warning from staff' other='Warnings from staff' />
        </p>
        {warnings.map((w, i) => (
          <p
            key={i}
            className='text-sm whitespace-pre-wrap text-muted-foreground'
          >
            {w.reason}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}
