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
import type { Asset, Listing, Photo, ShippingOption } from '@/types'
import type { Condition, Currency, Interval, ListingType, PricingModel } from '@/types/common'
import { listingsApi } from '@/api/listings'
import { photosApi } from '@/api/photos'
import { assetsApi } from '@/api/assets'
import { client } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import { getThumbnailUrl } from '@/lib/photos'
import { parseLocation } from '@/lib/format'
import {
  AUCTION_DURATIONS,
  CONDITIONS,
  CURRENCIES,
  INTERVALS,
  LISTING_TYPES,
  PRICING_MODELS,
} from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'

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
  let tags: string[] = []
  try {
    tags = listing?.tags ? JSON.parse(listing.tags) : []
  } catch {
    tags = []
  }
  return {
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    category: String(listing?.category ?? '0'),
    condition: (listing?.condition as Condition) || 'new',
    type: (listing?.type as ListingType) || 'physical',
    pricing: (listing?.pricing as PricingModel) || 'fixed',
    price: listing?.price ? String(listing.price / 100) : '',
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
    price: Math.round(Number(form.price) * 100),
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
    from: '/_authenticated/listings/$listingId_/edit',
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
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(
    () =>
      (detail?.shipping ?? []).map((opt) => ({
        ...opt,
        price: opt.price ? String(opt.price / 100) as unknown as number : 0,
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
    try {
      const raw = sessionStorage.getItem(`relist:${listing.id}`)
      if (!raw) return null
      sessionStorage.removeItem(`relist:${listing.id}`)
      return JSON.parse(raw) as { reserve: number; instant: number; duration: string }
    } catch {
      return null
    }
  })()
  const [auctionDuration, setAuctionDuration] = useState(relistInit?.duration ?? '7')
  const [reserve, setReserve] = useState(relistInit?.reserve ? String(relistInit.reserve / 100) : '')
  const [instantBuy, setInstantBuy] = useState(relistInit?.instant ? String(relistInit.instant / 100) : '')

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
    if (!listing) return
    if (!dirtyFormRef.current && !dirtyShippingRef.current) return
    const timer = setTimeout(() => {
      void saveNow()
    }, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, shippingOptions])

  async function saveNow() {
    if (!listing) return
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
          price: Math.round((Number(opt.price) || 0) * 100),
          currency: opt.currency,
          days: opt.days,
          notes: opt.notes,
        }))
        await client.post(endpoints.shipping.set, {
          listing: listing.id,
          options: JSON.stringify(options),
        })
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

  const missing = publishMissing(form)
  const canPublish = missing.length === 0
  const isDraft = listing.status === 'draft'

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
        params.closes = Math.floor(Date.now() / 1000) + Number(auctionDuration) * 86400
        if (reserve) params.reserve = Math.round(Number(reserve) * 100)
        if (instantBuy) params.instant = Math.round(Number(instantBuy) * 100)
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
        filter: (m) => m.routeId === '/_authenticated/listings/mine',
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
                  title={canPublish ? undefined : `Missing: ${missing.join(', ')}`}
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
        <div className='max-w-2xl space-y-8'>
          {/* Essentials */}
          <section className='space-y-4'>
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
            <div className='grid gap-4 sm:grid-cols-2'>
              {form.type === 'physical' && (
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
              )}
              <div className='space-y-1.5'>
                <Label>Pricing</Label>
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
                  onValueChange={(v) => update('currency', v as Currency)}
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
                  inputMode='decimal'
                  value={form.price}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return
                    update('price', val)
                  }}
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
              {form.pricing === 'auction' && (
                <>
                  <div className='space-y-1.5'>
                    <Label>Auction duration</Label>
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
                    <Label htmlFor='reserve'>
                      {currencySymbol ? `Reserve price (${currencySymbol})` : 'Reserve price'}
                    </Label>
                    <Input
                      id='reserve'
                      inputMode='decimal'
                      placeholder='Optional'
                      value={reserve}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return
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
                      inputMode='decimal'
                      placeholder='Optional'
                      value={instantBuy}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return
                        setInstantBuy(val)
                      }}
                    />
                  </div>
                </>
              )}
              {form.type === 'physical' && (
                <div className='space-y-1.5'>
                  <Label htmlFor='quantity'>Quantity (0 = unlimited)</Label>
                  <Input
                    id='quantity'
                    type='number'
                    min='0'
                    value={form.quantity}
                    onChange={(e) => update('quantity', e.target.value)}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Description */}
          <section className='space-y-4'>
            <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
              Description
            </h2>
            <div className='space-y-1.5'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={6}
              />
            </div>
            <div className='space-y-1.5'>
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
          <section className='space-y-4'>
            <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
              Photos
            </h2>
            <div className='grid grid-cols-3 gap-4'>
              {photos.map((photo) => (
                <div key={photo.id} className='group relative'>
                  <div className='aspect-square overflow-hidden rounded-[10px] bg-muted'>
                    <img
                      src={getThumbnailUrl(photo)}
                      alt=''
                      className='size-full object-cover'
                    />
                  </div>
                  <Button
                    variant='destructive'
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
                  className='flex aspect-square items-center justify-center rounded-[10px] border border-dashed'
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
            <section className='space-y-4'>
              <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
                Digital assets
              </h2>
              {(assets.length > 0 || uploadingAssets > 0) && (
                <div className='space-y-2'>
                  {assets.map((asset: Asset) => (
                    <div
                      key={asset.id}
                      className='group flex items-center justify-between rounded-[10px] border p-3 text-sm'
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
                      className='flex items-center gap-3 rounded-[10px] border border-dashed p-3 text-sm text-muted-foreground'
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
                <div className='space-y-2 rounded-[10px] border p-3'>
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
            <section className='space-y-4'>
              <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
                Delivery
              </h2>
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
                            inputMode='decimal'
                            value={opt.price || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return
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
                      <div className='flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm'>
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
              <Card className='rounded-[10px]'>
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
