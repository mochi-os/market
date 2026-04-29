import { useEffect, useRef, useState } from 'react'
import { useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import {
  Check,
  Edit,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  GeneralError,
  Input,
  Label,
  Main,
  PageHeader,
  PlacePicker,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toast,
  getErrorMessage,
  usePageTitle,
  useFormat,
  type PlaceData,
} from '@mochi/web'
import type { Asset, Fees, Listing, Photo, ShippingOption } from '@/types'
import type { Condition, Currency, Interval, ListingType, PricingModel } from '@/types/common'
import { listingsApi } from '@/api/listings'
import { accountsApi } from '@/api/accounts'
import { photosApi } from '@/api/photos'
import { assetsApi } from '@/api/assets'
import { shippingApi } from '@/api/shipping'
import { getThumbnailUrl } from '@/lib/photos'
import { parseLocation, toMinorUnits, fromMinorUnits, currencyDecimals, priceRegex, coerceForCurrency, safeJsonParse } from '@/lib/format'
import {
  AUCTION_DURATIONS,
  CONDITIONS,
  CURRENCIES,
  INTERVALS,
  LISTING_TYPES,
  PRICING_MODELS,
} from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'
import { useAccountStore } from '@/stores/account-store'
import { FeePreview } from '@/components/shared/fee-preview'
import { useStripeConnect } from './use-stripe-connect'

type SaveStatus = 'idle' | 'saving' | 'saved'

type ListingForm = {
  title: string
  description: string
  category: string
  condition: Condition | ''
  type: ListingType | ''
  pricing: PricingModel
  price: string
  currency: Currency
  interval: Interval | ''
  quantity: string
  location: string
  information: string
  tags: string[]
  pickup: boolean
  shipping: boolean
}

function initialForm(listing: Listing | undefined): ListingForm {
  const tags = safeJsonParse<string[]>(listing?.tags ?? null, [])
  return {
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    category: String(listing?.category ?? '0'),
    condition: (listing?.condition as Condition) || 'new',
    type: (listing?.type as ListingType) || 'physical',
    pricing: (listing?.pricing as PricingModel) || 'fixed',
    price: listing?.price ? String(fromMinorUnits(listing.price, listing?.currency || 'gbp')) : '',
    currency: (listing?.currency as Currency) || 'gbp',
    interval: (listing?.interval as Interval) || '',
    quantity: String(listing?.quantity ?? ''),
    location: listing?.location ?? '',
    information: listing?.information ?? '',
    tags,
    pickup: !!listing?.pickup,
    shipping: !!listing?.shipping,
  }
}

function serializeForm(form: ListingForm): Record<string, unknown> {
  return {
    title: form.title,
    description: form.description,
    category: Number(form.category),
    condition: form.condition,
    type: form.type,
    pricing: form.pricing,
    price: toMinorUnits(form.price, form.currency),
    currency: form.currency,
    interval: form.interval,
    quantity: Number(form.quantity) || 0,
    location: form.location,
    information: form.information,
    tags: JSON.stringify(form.tags),
    pickup: form.pickup ? 1 : 0,
    shipping: form.shipping ? 1 : 0,
  }
}

export function EditListingPage() {
  const { formatFileSize } = useFormat()
  const { detail, photos: initialPhotos, error } = useLoaderData({
    from: '/_authenticated/listings_/$listingId_/edit',
  })
  const navigate = useNavigate()
  const router = useRouter()
  const listing = detail?.listing
  usePageTitle(listing?.title ? `Edit ${listing.title}` : 'Edit listing')

  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ?? [])
  const [assets, setAssets] = useState<Asset[]>(detail?.assets ?? [])
  const [uploading, setUploading] = useState(0)
  const [uploadingAssets, setUploadingAssets] = useState(0)
  const [externalUrl, setExternalUrl] = useState('')
  const [externalName, setExternalName] = useState('')
  const [addingExternal, setAddingExternal] = useState(false)
  const [placePicker, setPlacePicker] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const [form, setForm] = useState<ListingForm>(() => initialForm(listing))
  const [unlimitedStock, setUnlimitedStock] = useState(
    !listing?.quantity || Number(listing.quantity) === 0,
  )
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(
    () =>
      (detail?.shipping ?? []).map((opt) => ({
        ...opt,
        price: opt.price
          ? String(fromMinorUnits(opt.price, opt.currency || listing?.currency || 'gbp')) as unknown as number
          : 0,
        currency: opt.currency || listing?.currency || 'gbp',
      }))
  )

  const [status, setStatus] = useState<SaveStatus>('idle')
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Auction publish params (pre-filled from sessionStorage if the user just relisted)
  const relistInit = (() => {
    if (!listing) return null
    const raw = sessionStorage.getItem(`relist:${listing.id}`)
    sessionStorage.removeItem(`relist:${listing.id}`)
    return safeJsonParse<{ reserve: number; instant: number; duration: string } | null>(raw, null)
  })()
  const [auctionDuration, setAuctionDuration] = useState(relistInit?.duration ?? '7')
  const relistCurrency = listing?.currency || 'gbp'
  const [reserve, setReserve] = useState(relistInit?.reserve ? String(fromMinorUnits(relistInit.reserve, relistCurrency)) : '')
  const [instantBuy, setInstantBuy] = useState(relistInit?.instant ? String(fromMinorUnits(relistInit.instant, relistCurrency)) : '')
  const [startTime, setStartTime] = useState('')

  const formRef = useRef(form)
  const shippingRef = useRef(shippingOptions)
  // If the server draft has no type/condition yet, the client-side defaults
  // ('physical' / 'new') need to be persisted on first autosave.
  const dirtyFormRef = useRef(!listing?.type || !listing?.condition)
  const dirtyShippingRef = useRef(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  formRef.current = form
  shippingRef.current = shippingOptions

  // Debounced autosave
  useEffect(() => {
    if (!listing || listing.status !== 'draft') return
    if (!dirtyFormRef.current && !dirtyShippingRef.current) return
    const timer = setTimeout(() => {
      void saveNow()
    }, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, shippingOptions])

  async function saveNow() {
    if (!listing || listing.status !== 'draft') return
    const willSaveForm = dirtyFormRef.current
    const willSaveShipping = dirtyShippingRef.current
    if (!willSaveForm && !willSaveShipping) return
    setStatus('saving')
    dirtyFormRef.current = false
    dirtyShippingRef.current = false
    try {
      if (willSaveForm) {
        await listingsApi.update({ id: listing.id, ...serializeForm(formRef.current) })
      }
      if (willSaveShipping) {
        const options = shippingRef.current.map((opt) => ({
          region: opt.region,
          price: opt.price ? toMinorUnits(opt.price, opt.currency) : 0,
          currency: opt.currency,
          days: opt.days,
          notes: opt.notes,
        }))
        await shippingApi.set(listing.id, options)
      }
      setStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save'))
      setStatus('idle')
    }
  }

  function update<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    dirtyFormRef.current = true
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateShipping(next: ShippingOption[]) {
    dirtyShippingRef.current = true
    setShippingOptions(next)
  }

  if (error) {
    return (
      <>
        <PageHeader icon={<Edit className='size-4 md:size-5' />} title='Edit listing' />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!listing) {
    return (
      <>
        <PageHeader icon={<Edit className='size-4 md:size-5' />} title='Edit listing' />
        <Main>
          <EmptyState icon={Edit} title='Listing not found' />
        </Main>
      </>
    )
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!listing || !e.target.files) return
    const files = Array.from(e.target.files)
    setUploading(files.length)
    for (const file of files) {
      try {
        const photo = await photosApi.upload(listing.id, file)
        setPhotos((prev) => [...prev, photo])
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to upload photo'))
      }
      setUploading((prev) => prev - 1)
    }
    e.target.value = ''
  }

  async function handleDeletePhoto(id: string) {
    try {
      await photosApi.delete(id)
      setPhotos((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete photo'))
    }
  }

  async function handleAssetUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!listing || !e.target.files) return
    const files = Array.from(e.target.files)
    setUploadingAssets(files.length)
    for (const file of files) {
      try {
        const asset = await assetsApi.upload(listing.id, file)
        setAssets((prev) => [...prev, asset])
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to upload asset'))
      }
      setUploadingAssets((prev) => prev - 1)
    }
    e.target.value = ''
  }

  async function handleDeleteAsset(id: number) {
    try {
      await assetsApi.remove(id)
      setAssets((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete asset'))
    }
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      update('tags', [...form.tags, t])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    update('tags', form.tags.filter((t) => t !== tag))
  }

  function addShippingOption() {
    updateShipping([
      ...shippingOptions,
      {
        id: 0,
        listing: listing?.id ?? 0,
        region: '',
        price: 0,
        currency: form.currency,
        days: '',
        notes: '',
      },
    ])
  }

  function updateShippingField(i: number, patch: Partial<ShippingOption>) {
    const next = [...shippingOptions]
    next[i] = { ...next[i], ...patch }
    updateShipping(next)
  }

  function removeShippingOption(i: number) {
    updateShipping(shippingOptions.filter((_, j) => j !== i))
  }

  const { isOnboarded } = useAccountStore()
  const missing = publishMissing(form)
  const canPublish = missing.length === 0 && isOnboarded
  const isDraft = listing.status === 'draft'
  const { connecting: connectingStripe, connect: handleConnectStripe } = useStripeConnect()
  const [fees, setFees] = useState<Fees | null>(null)

  useEffect(() => {
    accountsApi.fees().then(setFees).catch(() => {})
  }, [])

  async function openPublish() {
    await saveNow()
    setPublishOpen(true)
  }

  async function handlePublish() {
    if (!listing) return
    setPublishing(true)
    try {
      const params: Record<string, unknown> = { id: listing.id }
      if (form.pricing === 'auction') {
        const nowSec = Math.floor(Date.now() / 1000)
        const opens = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : nowSec
        if (opens > nowSec) params.opens = opens
        params.closes = opens + Number(auctionDuration) * 86400
        if (reserve) params.reserve = toMinorUnits(reserve, form.currency)
        if (instantBuy) params.instant = toMinorUnits(instantBuy, form.currency)
      }
      await listingsApi.publish(params)
      toast.success('Listing published')
      navigate({ to: APP_ROUTES.LISTINGS.VIEW(listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to publish'))
      setPublishing(false)
    }
  }

  async function handleDelete() {
    if (!listing) return
    setDeleting(true)
    try {
      await listingsApi.delete(listing.id)
      toast.success('Draft deleted')
      await router.invalidate({
        filter: (m) => m.routeId === '/_authenticated/listings',
      })
      navigate({ to: APP_ROUTES.LISTINGS.MINE })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'))
      setDeleting(false)
    }
  }

  const currencySymbol = CURRENCIES.find((c) => c.value === form.currency)?.symbol
  const priceLabel =
    form.pricing === 'auction' ? 'Starting bid' : form.pricing === 'pwyw' ? 'Minimum price' : 'Price'

  return (
    <>
      <PageHeader
        icon={<Edit className='size-4 md:size-5' />}
        title={listing.title || 'Untitled listing'}
        back={{ label: 'My listings', onFallback: () => navigate({ to: APP_ROUTES.LISTINGS.MINE }) }}
        actions={
          <div className='flex items-center gap-3'>
            <SaveIndicator status={status} />
            {isDraft && (
              <>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className='size-4' />
                  Delete draft
                </Button>
                <Button
                  size='sm'
                  onClick={() => void openPublish()}
                  disabled={!canPublish}
                  title={
                    canPublish
                      ? undefined
                      : !isOnboarded
                        ? 'Connect Stripe to publish'
                        : `Missing: ${missing.join(', ')}`
                  }
                >
                  <Send className='size-4' />
                  Publish
                </Button>
              </>
            )}
          </div>
        }
      />
      <Main>
        <div className='max-w-2xl space-y-6'>
          {isDraft && !isOnboarded && (
            <div className='flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
              <span>Connect Stripe to publish listings.</span>
              <Button
                size='sm'
                variant='outline'
                onClick={handleConnectStripe}
                disabled={connectingStripe}
              >
                {connectingStripe ? 'Loading...' : 'Connect Stripe'}
              </Button>
            </div>
          )}
          {!isDraft && (
            <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
              This listing is {listing.status}. Editing is disabled.
            </div>
          )}
          <fieldset disabled={!isDraft} className='m-0 min-w-0 space-y-6 border-0 p-0'>
          <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
            <h2 className='text-base font-semibold'>Basics</h2>
            <div className='space-y-1.5'>
              <Label htmlFor='title'>Title</Label>
              <Input
                id='title'
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                maxLength={200}
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Type</Label>
              <RadioGroup
                value={form.type}
                onValueChange={(v) => update('type', v as ListingType)}
                className='flex flex-row gap-6'
              >
                {LISTING_TYPES.map((t) => (
                  <label key={t.value} className='flex items-center gap-2 cursor-pointer'>
                    <RadioGroupItem value={t.value} id={`type-${t.value}`} />
                    <span className='text-sm'>{t.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            {form.type === 'physical' && (
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label>Condition</Label>
                  <Select
                    value={form.condition}
                    onValueChange={(v) => update('condition', v as Condition)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select condition' />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='quantity'>Stock</Label>
                  <Input
                    id='quantity'
                    type='number'
                    min='1'
                    placeholder={unlimitedStock ? 'Unlimited' : 'Number of units'}
                    value={unlimitedStock ? '' : form.quantity}
                    onChange={(e) => update('quantity', e.target.value)}
                    disabled={unlimitedStock}
                  />
                  <div className='flex items-center gap-2'>
                    <Switch
                      id='unlimited-stock'
                      checked={unlimitedStock}
                      onCheckedChange={(v) => {
                        setUnlimitedStock(v)
                        update('quantity', v ? '0' : '1')
                      }}
                    />
                    <Label htmlFor='unlimited-stock' className='font-normal'>
                      Unlimited
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
            <h2 className='text-base font-semibold'>Pricing</h2>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label>Model</Label>
                <Select
                  value={form.pricing}
                  onValueChange={(v) => update('pricing', v as PricingModel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select pricing' />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_MODELS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => {
                    const next = v as Currency
                    dirtyFormRef.current = true
                    setForm((f) => ({
                      ...f,
                      currency: next,
                      price: coerceForCurrency(f.price, next),
                    }))
                    setReserve((r) => coerceForCurrency(r, next))
                    setInstantBuy((b) => coerceForCurrency(b, next))
                    dirtyShippingRef.current = true
                    setShippingOptions((opts) =>
                      opts.map((o) => ({
                        ...o,
                        price: coerceForCurrency(String(o.price ?? ''), next) as unknown as number,
                        currency: next,
                      })),
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='price'>
                  {currencySymbol ? `${priceLabel} (${currencySymbol})` : priceLabel}
                </Label>
                <Input
                  id='price'
                  inputMode={currencyDecimals(form.currency) === 0 ? 'numeric' : 'decimal'}
                  value={form.price}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val !== '' && !priceRegex(form.currency).test(val)) return
                    update('price', val)
                  }}
                />
                <FeePreview
                  fees={fees}
                  price={form.price}
                  currency={form.currency}
                  pricing={form.pricing}
                />
              </div>
              {form.pricing === 'subscription' && (
                <div className='space-y-1.5'>
                  <Label>Interval</Label>
                  <Select
                    value={form.interval}
                    onValueChange={(v) => update('interval', v as Interval)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select interval' />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVALS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {form.pricing === 'auction' && (
            <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
              <h2 className='text-base font-semibold'>Auction</h2>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label>Duration</Label>
                  <Select value={auctionDuration} onValueChange={setAuctionDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUCTION_DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='startTime'>Start time</Label>
                  <Input
                    id='startTime'
                    type='datetime-local'
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <p className='text-xs text-muted-foreground'>
                    Leave blank to start on publish.
                  </p>
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reserve'>
                    {currencySymbol ? `Reserve price (${currencySymbol})` : 'Reserve price'}
                  </Label>
                  <Input
                    id='reserve'
                    inputMode={currencyDecimals(form.currency) === 0 ? 'numeric' : 'decimal'}
                    placeholder='Optional'
                    value={reserve}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val !== '' && !priceRegex(form.currency).test(val)) return
                      setReserve(val)
                    }}
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='instant'>
                    {currencySymbol ? `Buy it now price (${currencySymbol})` : 'Buy it now price'}
                  </Label>
                  <Input
                    id='instant'
                    inputMode={currencyDecimals(form.currency) === 0 ? 'numeric' : 'decimal'}
                    placeholder='Optional'
                    value={instantBuy}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val !== '' && !priceRegex(form.currency).test(val)) return
                      setInstantBuy(val)
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Description */}
          <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
            <h2 className='text-base font-semibold'>Description</h2>
            <Textarea
              id='description'
              aria-label='Description'
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={6}
            />
            <div className='space-y-1.5 pt-2'>
              <Label>Tags</Label>
              <div className='flex gap-2'>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  className='max-w-xs'
                />
                <Button type='button' variant='outline' size='sm' onClick={addTag}>
                  Add
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-2'>
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className='inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs'
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className='size-3' />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Photos */}
          <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
            <h2 className='text-base font-semibold'>Photos</h2>
            <div className='grid grid-cols-3 gap-4'>
              {photos.map((photo) => (
                <div key={photo.id} className='group relative'>
                  <div className='aspect-square overflow-hidden rounded-lg bg-muted'>
                    <img
                      src={getThumbnailUrl(photo)}
                      alt=''
                      className='size-full object-cover'
                    />
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='absolute right-1 top-1 size-6 opacity-0 group-hover:opacity-100'
                    onClick={() => handleDeletePhoto(photo.id)}
                  >
                    <Trash2 className='size-3' />
                  </Button>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <div
                  key={`uploading-${i}`}
                  className='flex aspect-square items-center justify-center rounded-lg border border-dashed'
                >
                  <Loader2 className='size-6 animate-spin text-muted-foreground' />
                </div>
              ))}
            </div>
            <label className='inline-flex cursor-pointer items-center gap-2'>
              <Button variant='outline' size='sm' asChild disabled={uploading > 0}>
                <span>
                  {uploading > 0 ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Upload className='size-4' />
                  )}
                  {uploading > 0 ? `Uploading ${uploading}...` : 'Upload photos'}
                </span>
              </Button>
              <input
                type='file'
                accept='image/*'
                multiple
                className='hidden'
                onChange={handlePhotoUpload}
                disabled={uploading > 0}
              />
            </label>
          </section>

          {/* Assets (digital only) */}
          {form.type === 'digital' && (
            <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
              <h2 className='text-base font-semibold'>Digital assets</h2>
              {(assets.length > 0 || uploadingAssets > 0) && (
                <div className='space-y-2'>
                  {assets.map((asset: Asset) => (
                    <div
                      key={asset.id}
                      className='group flex items-center justify-between rounded-lg border p-3 text-sm'
                    >
                      <div className='flex items-center gap-2 min-w-0'>
                        {asset.hosting === 'external' && (
                          <ExternalLink className='size-3.5 shrink-0 text-muted-foreground' />
                        )}
                        <span className='truncate'>{asset.filename}</span>
                      </div>
                      <div className='flex items-center gap-2 shrink-0'>
                        <span className='text-muted-foreground'>
                          {asset.hosting === 'external' ? 'External' : formatFileSize(asset.size)}
                        </span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-6 opacity-0 group-hover:opacity-100'
                          onClick={() => handleDeleteAsset(asset.id)}
                        >
                          <Trash2 className='size-3' />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: uploadingAssets }).map((_, i) => (
                    <div
                      key={`uploading-${i}`}
                      className='flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground'
                    >
                      <Loader2 className='size-4 animate-spin' />
                      <span>Uploading...</span>
                    </div>
                  ))}
                </div>
              )}
              <div className='flex gap-2'>
                <label className='inline-flex cursor-pointer items-center gap-2'>
                  <Button variant='outline' size='sm' asChild disabled={uploadingAssets > 0}>
                    <span>
                      {uploadingAssets > 0 ? (
                        <Loader2 className='size-4 animate-spin' />
                      ) : (
                        <Upload className='size-4' />
                      )}
                      {uploadingAssets > 0 ? `Uploading ${uploadingAssets}...` : 'Upload file'}
                    </span>
                  </Button>
                  <input
                    type='file'
                    multiple
                    className='hidden'
                    onChange={handleAssetUpload}
                    disabled={uploadingAssets > 0}
                  />
                </label>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setAddingExternal(!addingExternal)}
                >
                  <ExternalLink className='size-4' />
                  External URL
                </Button>
              </div>
              {addingExternal && (
                <div className='space-y-2 rounded-lg border p-3'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='external-name'>Filename</Label>
                    <Input
                      id='external-name'
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      placeholder='e.g. my-album.zip'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='external-url'>URL</Label>
                    <Input
                      id='external-url'
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder='https://...'
                    />
                  </div>
                  <Button
                    size='sm'
                    disabled={!externalUrl.trim() || !externalName.trim()}
                    onClick={async () => {
                      if (!listing) return
                      try {
                        const updatedAssets = await assetsApi.external({
                          listing: listing.id,
                          filename: externalName.trim(),
                          mime: '',
                          reference: externalUrl.trim(),
                        })
                        setAssets(updatedAssets)
                        setExternalUrl('')
                        setExternalName('')
                        setAddingExternal(false)
                      } catch (err) {
                        toast.error(getErrorMessage(err, 'Failed to add external asset'))
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Delivery (physical only) */}
          {form.type === 'physical' && (
            <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
              <h2 className='text-base font-semibold'>Delivery</h2>
              <div className='space-y-1.5'>
                <Label>Delivery methods</Label>
                <div className='flex items-center gap-6 pl-1'>
                  <div className='flex items-center gap-2'>
                    <Switch
                      id='shipping-switch'
                      checked={form.shipping}
                      onCheckedChange={(v) => update('shipping', v)}
                    />
                    <Label htmlFor='shipping-switch' className='font-normal'>
                      Shipping
                    </Label>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Switch
                      id='pickup-switch'
                      checked={form.pickup}
                      onCheckedChange={(v) => update('pickup', v)}
                    />
                    <Label htmlFor='pickup-switch' className='font-normal'>
                      Pickup
                    </Label>
                  </div>
                </div>
              </div>

              {form.shipping && (
                <div className='space-y-1.5'>
                  <Label>Shipping options</Label>
                  {shippingOptions.length > 0 && (
                    <div className='divide-y'>
                      <div className='grid grid-cols-[1fr_6rem_5rem_2rem] items-center gap-3 pb-1.5 text-xs text-muted-foreground'>
                        <span>Region</span>
                        <span>{currencySymbol ? `Price (${currencySymbol})` : 'Price'}</span>
                        <span>Days</span>
                        <span />
                      </div>
                      {shippingOptions.map((opt, i) => (
                        <div
                          key={i}
                          className='grid grid-cols-[1fr_6rem_5rem_2rem] items-center gap-3 py-2'
                        >
                          <Input
                            value={opt.region}
                            onChange={(e) => updateShippingField(i, { region: e.target.value })}
                          />
                          <Input
                            inputMode={currencyDecimals(opt.currency) === 0 ? 'numeric' : 'decimal'}
                            value={opt.price || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val !== '' && !priceRegex(opt.currency).test(val)) return
                              updateShippingField(i, { price: val as unknown as number })
                            }}
                          />
                          <Input
                            value={opt.days}
                            onChange={(e) => updateShippingField(i, { days: e.target.value })}
                          />
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            onClick={() => removeShippingOption(i)}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant='outline' size='sm' onClick={addShippingOption} className='mt-2'>
                    <Plus className='mr-1 size-4' /> Add shipping option
                  </Button>
                </div>
              )}

              <div className='space-y-1.5'>
                <Label>Location</Label>
                {(() => {
                  const parsed = parseLocation(form.location)
                  if (parsed) {
                    return (
                      <div className='flex items-center gap-2 rounded-lg border px-3 py-2 text-sm'>
                        <MapPin className='size-4 text-muted-foreground' />
                        <span className='flex-1'>{parsed.name}</span>
                        <button
                          type='button'
                          onClick={() => update('location', '')}
                          className='text-muted-foreground hover:text-foreground'
                        >
                          <X className='size-4' />
                        </button>
                      </div>
                    )
                  }
                  return (
                    <Button
                      variant='outline'
                      className='w-full justify-start text-muted-foreground'
                      onClick={() => setPlacePicker(true)}
                    >
                      <MapPin className='mr-2 size-4' />
                      Set location
                    </Button>
                  )
                })()}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='information'>Delivery information</Label>
                <Textarea
                  id='information'
                  value={form.information}
                  onChange={(e) => update('information', e.target.value)}
                  rows={3}
                />
              </div>
            </section>
          )}
          </fieldset>
        </div>

        <PlacePicker
          open={placePicker}
          onOpenChange={setPlacePicker}
          onSelect={(place: PlaceData) => {
            update('location', JSON.stringify(place))
            setPlacePicker(false)
          }}
        />

        <Dialog open={publishOpen} onOpenChange={(o) => !publishing && setPublishOpen(o)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish listing</DialogTitle>
            </DialogHeader>
            <div className='space-y-4 py-2'>
              <Card className='rounded-lg'>
                <CardContent className='p-3 text-sm space-y-1'>
                  <div className='font-medium'>{form.title}</div>
                  <div className='text-muted-foreground'>
                    {LISTING_TYPES.find((t) => t.value === form.type)?.label} ·{' '}
                    {PRICING_MODELS.find((p) => p.value === form.pricing)?.label}
                  </div>
                </CardContent>
              </Card>
              <p className='text-sm text-muted-foreground'>
                Your listing will be reviewed automatically and may require moderator approval
                before becoming visible to other users.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setPublishOpen(false)}
                disabled={publishing}
              >
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={publishing}>
                <Send className='size-4' />
                {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete draft?</DialogTitle>
            </DialogHeader>
            <p className='text-sm py-2'>
              This draft listing will be permanently removed.
            </p>
            <DialogFooter>
              <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}

function publishMissing(form: ListingForm): string[] {
  const missing: string[] = []
  if (!form.title.trim()) missing.push('title')
  if (!form.type) missing.push('type')
  if (!form.pricing) missing.push('pricing')
  if (!form.currency) missing.push('currency')
  return missing
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  if (status === 'saving') {
    return (
      <span className='flex items-center gap-1 text-xs text-muted-foreground'>
        <Loader2 className='size-3 animate-spin' />
        Saving…
      </span>
    )
  }
  return (
    <span className='flex items-center gap-1 text-xs text-muted-foreground'>
      <Check className='size-3' />
      Saved
    </span>
  )
}
