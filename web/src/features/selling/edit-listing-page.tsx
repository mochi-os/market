// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useRef, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import {
  Check,
  Edit,
  ExternalLink,
  Link,
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  UploadProgress,
  cn,
  toast,
  toastAction,
  getErrorMessage,
  usePageTitle,
  useFormat,
  usePersistedReorder,
  useUploadProgress,
  sequence,
  type PlaceData,
} from '@mochi/web'
import type { Asset, Category, Fees, Listing, Photo, ShippingOption } from '@/types'
import type { Condition, Currency, Interval, ListingType, PricingModel } from '@/types/common'
import { listingsApi, categoriesApi } from '@/api/listings'
import { accountsApi } from '@/api/accounts'
import { photosApi } from '@/api/photos'
import { assetsApi } from '@/api/assets'
import { shippingApi } from '@/api/shipping'
import { parseLocation, toMinorUnits, fromMinorUnits, currencyDecimals, priceRegex, coerceForCurrency, safeJsonParse, useFormatPrice } from '@/lib/format'
import {
  CURRENCIES_DATA,
  useAuctionDurations,
  useConditions,
  useCurrencies,
  useIntervals,
  useListingTypes,
  usePricingModels,
} from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'
import { useAccountStore } from '@/stores/account-store'
import { FeePreview } from '@/components/shared/fee-preview'
import { useStripeConnect } from './use-stripe-connect'

type SaveStatus = 'idle' | 'saving' | 'saved'

// Radix rejects an empty string as a SelectItem value, so "no category" travels
// as a sentinel and is mapped back to '' before it reaches the form.
const NO_CATEGORY = '__none__'

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
    category: String(listing?.category ?? ''),
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
    category: form.category,
    condition: form.condition,
    type: form.type,
    pricing: form.pricing,
    price: toMinorUnits(form.price, form.currency),
    currency: form.currency,
    interval: form.interval,
    quantity: form.pricing === 'auction' ? 1 : (Number(form.quantity) || 0),
    location: form.location,
    information: form.information,
    tags: JSON.stringify(form.tags),
    pickup: form.pickup ? 1 : 0,
    shipping: form.shipping ? 1 : 0,
  }
}

// Minimum price for a currency in minor units. The Comptroller's disclosure
// via accounts/fees is the enforced rule; the static CURRENCIES_DATA copy is
// only the fallback while fees are loading (or against an older Comptroller
// that doesn't send minimums yet).
function currencyMinimum(currency: string, fees: Fees | null): number {
  return (
    fees?.minimums?.[currency] ??
    CURRENCIES_DATA.find((c) => c.value === currency)?.minimum ??
    0
  )
}

// Mirror the Comptroller's price_below_stripe_minimum rule (#446). Price 0 is
// an unpriced draft; publish is the gate for that.
function isPriceBelowMinimum(form: ListingForm, fees: Fees | null): boolean {
  const minimum = currencyMinimum(form.currency, fees)
  const minor = form.price ? toMinorUnits(form.price, form.currency) : 0
  return minimum > 0 && minor > 0 && minor < minimum
}

// A draft listing's photos are served only through the authenticated owned
// route (an <img> can't carry the app JWT from the sandboxed iframe), so fetch
// the thumbnail bytes and render them via an object URL, revoked on unmount.
function OwnedPhotoThumb({ photo }: { photo: Photo }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    photosApi
      .ownedBlob(photo.id, 'thumbnail')
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {})
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photo.id])
  return url ? (
    // Not draggable: a native image drag beats the pointer to it, and the
    // pointercancel that follows reads as a cancelled reorder.
    <img src={url} alt='' draggable={false} className='size-full object-cover' />
  ) : (
    <div className='size-full' />
  )
}

export function EditListingPage() {
  const { t } = useLingui()
  const { formatFileSize } = useFormat()
  const AUCTION_DURATIONS = useAuctionDurations()
  const CONDITIONS = useConditions()
  const CURRENCIES = useCurrencies()
  const formatPrice = useFormatPrice()
  const INTERVALS = useIntervals()
  const LISTING_TYPES = useListingTypes()
  const PRICING_MODELS = usePricingModels()
  const { detail, photos: initialPhotos, error } = useLoaderData({
    from: '/_authenticated/listings_/$listingId_/edit',
  })
  const navigate = useNavigate()
  const router = useRouter()
  const listing = detail?.listing
  usePageTitle(listing?.title ? t`Edit ${listing.title}` : t`Edit listing`)

  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ?? [])
  const [assets, setAssets] = useState<Asset[]>(detail?.assets ?? [])
  const [uploading, setUploading] = useState(0)
  const [uploadingAssets, setUploadingAssets] = useState(0)
  const { progress: photoProgress, upload: uploadPhoto } = useUploadProgress()
  const { progress: assetProgress, upload: uploadAsset } = useUploadProgress()
  const [externalUrl, setExternalUrl] = useState('')
  const [externalName, setExternalName] = useState('')
  const [addingExternal, setAddingExternal] = useState(false)
  const [placePicker, setPlacePicker] = useState(false)
  const [tagInput, setTagInput] = useState('')

  // Photos and assets are uploaded the moment they are picked, so their order
  // is the server's rather than a draft's: each drop writes it, and a write
  // that fails puts the row back where it was rather than leaving the screen
  // disagreeing with the listing buyers will see.
  const photoOrder = usePersistedReorder<Photo>({
    items: photos,
    setItems: setPhotos,
    enabled: Boolean(listing) && uploading === 0,
    save: (next) => photosApi.reorder(listing!.id, next.map((photo) => photo.id)),
    onError: (err) =>
      toast.error(getErrorMessage(err, t`Failed to reorder photos`)),
  })

  const assetOrder = usePersistedReorder<Asset>({
    items: assets,
    setItems: setAssets,
    enabled: Boolean(listing) && uploadingAssets === 0,
    save: (next) => assetsApi.reorder(listing!.id, next.map((asset) => asset.id)),
    onError: (err) =>
      toast.error(getErrorMessage(err, t`Failed to reorder files`)),
  })

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

  // Auction publish params (pre-filled from sessionStorage if the user just
  // relisted). Best-effort: sessionStorage can throw on an opaque origin in
  // strict browsers; the editor must render without the prefill.
  const relistInit = (() => {
    if (!listing) return null
    try {
      const raw = sessionStorage.getItem(`relist:${listing.id}`)
      sessionStorage.removeItem(`relist:${listing.id}`)
      return safeJsonParse<{ reserve: number; instant: number; duration: string } | null>(raw, null)
    } catch {
      return null
    }
  })()
  const [auctionDuration, setAuctionDuration] = useState(relistInit?.duration ?? '7')
  const relistCurrency = listing?.currency || 'gbp'
  const [reserve, setReserve] = useState(relistInit?.reserve ? String(fromMinorUnits(relistInit.reserve, relistCurrency)) : '')
  const [instantBuy, setInstantBuy] = useState(relistInit?.instant ? String(fromMinorUnits(relistInit.instant, relistCurrency)) : '')
  const [startTime, setStartTime] = useState('')

  const { account, isOnboarded } = useAccountStore()
  const stripeLinked = !!account?.stripe
  const stripeDashboard = account?.stripe_testmode
    ? 'https://dashboard.stripe.com/test/'
    : 'https://dashboard.stripe.com/'
  const { connecting: connectingStripe, connect: handleConnectStripe } = useStripeConnect()
  const [fees, setFees] = useState<Fees | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    accountsApi.fees().then(setFees).catch(() => {})
    categoriesApi
      .list()
      .then((list) => {
        setCategories(list)
        // The Comptroller lists active categories only, and rejects a save that
        // names an inactive one. A listing filed under a category staff has since
        // retired would be stuck unsaveable, so drop it here and let the seller
        // pick again. Straight to setForm rather than update(): this is not an
        // edit the seller made, and marking the form dirty would autosave it.
        setForm((f) =>
          f.category && !list.some((c) => c.id === f.category)
            ? { ...f, category: '' }
            : f
        )
      })
      .catch(() => {})
  }, [])

  // Categories declare which listing types they accept, so a digital listing is
  // not offered Clothing. The current selection always stays in the list, or
  // Radix would render the trigger empty and the seller could not tell what the
  // listing is filed under.
  const categoryOptions = categories.filter(
    (c) =>
      c.id === form.category ||
      (form.type === 'digital' ? c.digital === 1 : c.physical === 1)
  )

  const formRef = useRef(form)
  const shippingRef = useRef(shippingOptions)
  const feesRef = useRef(fees)
  // If the server draft has no type/condition yet, the client-side defaults
  // ('physical' / 'new') need to be persisted on first autosave.
  const dirtyFormRef = useRef(!listing?.type || !listing?.condition)
  const dirtyShippingRef = useRef(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  formRef.current = form
  shippingRef.current = shippingOptions
  feesRef.current = fees

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

  // Saves run one at a time. saveNow clears the dirty flags before awaiting the
  // request, so a second caller arriving mid-save reads them clean and returns
  // without waiting - openPublish is that caller, and it then published a draft
  // whose type the in-flight save had not stored yet, which the Comptroller
  // refuses with "Type required" (#498). Queueing makes it re-read the flags
  // after the save it was racing has landed.
  const runSave = useRef(sequence()).current

  async function saveNow() {
    return runSave(saveOnce)
  }

  async function saveOnce() {
    if (!listing || listing.status !== 'draft') return
    // Hold the form save while the price is below the currency minimum: the
    // server would reject the whole update, so persisting it would strand the
    // field value out of sync with what's saved (#446). Keep it dirty and let
    // the next autosave pick it up once the price is valid. Shipping still saves.
    const willSaveForm = dirtyFormRef.current && !isPriceBelowMinimum(formRef.current, feesRef.current)
    const willSaveShipping = dirtyShippingRef.current
    if (!willSaveForm && !willSaveShipping) return
    setStatus('saving')
    if (willSaveForm) dirtyFormRef.current = false
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
      toast.error(getErrorMessage(err, t`Failed to save`))
      // The server rejected this attempt, so what it tried to save is still
      // unsaved — re-mark it dirty or the next autosave never retries and the
      // form silently diverges from the stored listing (#446).
      if (willSaveForm) dirtyFormRef.current = true
      if (willSaveShipping) dirtyShippingRef.current = true
      setStatus('idle')
    }
  }

  function update<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    dirtyFormRef.current = true
    setForm((f) => ({ ...f, [key]: value }))
  }

  // A category accepts physical listings, digital ones, or both. Switching type
  // away from what the current category accepts leaves a selection the picker no
  // longer offers, so clear it rather than save something the seller cannot see.
  function changeType(next: ListingType) {
    dirtyFormRef.current = true
    setForm((f) => {
      const category = categories.find((c) => c.id === f.category)
      const keep = !category || (next === 'digital' ? category.digital === 1 : category.physical === 1)
      return { ...f, type: next, category: keep ? f.category : '' }
    })
  }

  function updateShipping(next: ShippingOption[]) {
    dirtyShippingRef.current = true
    setShippingOptions(next)
  }

  if (error) {
    return (
      <>
        <PageHeader icon={<Edit className='size-4 md:size-5' />} title={t`Edit listing`} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!listing) {
    return (
      <>
        <PageHeader icon={<Edit className='size-4 md:size-5' />} title={t`Edit listing`} />
        <Main>
          <EmptyState icon={Edit} title={t`Listing not found`} />
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
        const photo = await uploadPhoto((onProgress) =>
          photosApi.upload(listing.id, file, onProgress),
        )
        setPhotos((prev) => [...prev, photo])
      } catch (err) {
        toast.error(getErrorMessage(err, t`Failed to upload photo`))
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
      toast.error(getErrorMessage(err, t`Failed to delete photo`))
    }
  }

  async function handleAssetUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!listing || !e.target.files) return
    const files = Array.from(e.target.files)
    setUploadingAssets(files.length)
    for (const file of files) {
      try {
        const asset = await uploadAsset((onProgress) =>
          assetsApi.upload(listing.id, file, onProgress),
        )
        setAssets((prev) => [...prev, asset])
      } catch (err) {
        toast.error(getErrorMessage(err, t`Failed to upload asset`))
      }
      setUploadingAssets((prev) => prev - 1)
    }
    e.target.value = ''
  }

  async function handleDeleteAsset(id: string) {
    try {
      await assetsApi.remove(id)
      setAssets((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to delete asset`))
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
        id: '',
        listing: listing?.id ?? '',
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
  const startPriceMinor = form.pricing === 'auction' && form.price ? toMinorUnits(form.price, form.currency) : 0
  const reserveMinor = reserve ? toMinorUnits(reserve, form.currency) : 0
  const instantMinor = instantBuy ? toMinorUnits(instantBuy, form.currency) : 0
  const reserveBelowStart = form.pricing === 'auction' && reserveMinor > 0 && startPriceMinor > 0 && reserveMinor <= startPriceMinor
  const instantBelowStart = form.pricing === 'auction' && instantMinor > 0 && startPriceMinor > 0 && instantMinor <= startPriceMinor
  const reserveAboveInstant = form.pricing === 'auction' && reserveMinor > 0 && instantMinor > 0 && reserveMinor > instantMinor
  const reserveInvalid = reserveBelowStart || reserveAboveInstant
  const instantInvalid = instantBelowStart
  const priceBelowMinimum = isPriceBelowMinimum(form, fees)
  const minDisplay = formatPrice(currencyMinimum(form.currency, fees), form.currency)
  const canPublish = missing.length === 0 && isOnboarded && !reserveInvalid && !instantInvalid && !priceBelowMinimum
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
        const nowSec = Math.floor(Date.now() / 1000)
        const opens = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : nowSec
        if (opens > nowSec) params.opens = opens
        params.closes = opens + Number(auctionDuration) * 86400
        if (reserve) params.reserve = toMinorUnits(reserve, form.currency)
        if (instantBuy) params.instant = toMinorUnits(instantBuy, form.currency)
      }
      await toastAction(listingsApi.publish(params), {
        loading: t`Publishing...`,
        success: (result) =>
          result?.moderation === 'hold'
            ? t`Listing submitted. Mochi staff will review it before it goes live.`
            : t`Your listing is live.`,
        error: (e) => getErrorMessage(e, t`Failed to publish`),
      })
      navigate({ to: APP_ROUTES.LISTINGS.VIEW(listing.id) })
    } catch {
      // toast already shown
    } finally {
      setPublishing(false)
    }
  }

  async function handleDelete() {
    if (!listing) return
    setDeleting(true)
    try {
      await toastAction(listingsApi.delete(listing.id), {
        loading: t`Deleting...`,
        success: t`Draft deleted`,
        error: (e) => getErrorMessage(e, t`Failed to delete`),
      })
      await router.invalidate({
        filter: (m) => m.routeId === '/_authenticated/listings',
      })
      navigate({ to: APP_ROUTES.LISTINGS.MINE })
    } catch {
      // toast already shown
    } finally {
      setDeleting(false)
    }
  }

  const currencySymbol = CURRENCIES.find((c) => c.value === form.currency)?.symbol
  const priceLabel =
    form.pricing === 'auction' ? t`Starting bid` : form.pricing === 'pwyw' ? t`Minimum price` : t`Price`

  return (
    <>
      <PageHeader
        icon={<Edit className='size-4 md:size-5' />}
        title={listing.title || t`Untitled listing`}
        back={{ label: t`My listings`, onFallback: () => navigate({ to: APP_ROUTES.LISTINGS.MINE }) }}
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
                  <Trans>Delete draft</Trans>
                </Button>
                <Button
                  size='sm'
                  onClick={() => void openPublish()}
                  disabled={!canPublish}
                  title={
                    canPublish
                      ? undefined
                      : !isOnboarded
                        ? t`Connect Stripe to publish`
                        : t`Missing: ${missing.join(', ')}`
                  }
                >
                  <Send className='size-4' />
                  <Trans>Publish</Trans>
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
              <span>
                {stripeLinked
                  ? <Trans>Stripe needs more information. Complete the requirements on your Stripe Dashboard to publish listings.</Trans>
                  : <Trans>Connect Stripe to publish listings.</Trans>}
              </span>
              {stripeLinked ? (
                <Button size='sm' variant='outline' asChild>
                  <a href={stripeDashboard} target='_blank' rel='noopener noreferrer'>
                    <ExternalLink className='size-4' />
                    <Trans>Open Stripe dashboard</Trans>
                  </a>
                </Button>
              ) : (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                >
                  <Link className="size-3.5" />
                  {connectingStripe ? t`Loading...` : t`Connect Stripe`}
                </Button>
              )}
            </div>
          )}
          {!isDraft && (
            <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
              <Trans>This listing is {listing.status}. Editing is disabled.</Trans>
            </div>
          )}
          <fieldset disabled={!isDraft} className='m-0 min-w-0 space-y-6 border-0 p-0'>
          <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
            <h2 className='text-base font-semibold'><Trans>Basics</Trans></h2>
            <div className='space-y-1.5'>
              <Label htmlFor='title'><Trans>Title</Trans></Label>
              <Input
                id='title'
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                maxLength={200}
              />
            </div>
            <div className='space-y-1.5'>
              <Label><Trans>Type</Trans></Label>
              <RadioGroup
                value={form.type}
                onValueChange={(v) => changeType(v as ListingType)}
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
            <div className='space-y-1.5'>
              <Label><Trans>Category</Trans></Label>
              <Select
                value={form.category || NO_CATEGORY}
                onValueChange={(v) => update('category', v === NO_CATEGORY ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t`Select category`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}><Trans>None</Trans></SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.type === 'physical' && (
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label><Trans>Condition</Trans></Label>
                  <Select
                    value={form.condition}
                    onValueChange={(v) => update('condition', v as Condition)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t`Select condition`} />
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
                {form.pricing !== 'auction' && (
                  <div className='space-y-2'>
                    <Label htmlFor='quantity'><Trans>Stock</Trans></Label>
                    <Input
                      id='quantity'
                      type='number'
                      min='1'
                      placeholder={unlimitedStock ? t`Unlimited` : t`Number of units`}
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
                        <Trans>Unlimited</Trans>
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
            <h2 className='text-base font-semibold'><Trans>Pricing</Trans></h2>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label><Trans>Model</Trans></Label>
                <Select
                  value={form.pricing}
                  onValueChange={(v) => update('pricing', v as PricingModel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t`Select pricing`} />
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
                <Label><Trans>Currency</Trans></Label>
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
                  aria-invalid={priceBelowMinimum}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val !== '' && !priceRegex(form.currency).test(val)) return
                    update('price', val)
                  }}
                />
                {priceBelowMinimum && (
                  <p className='text-xs text-destructive' role='alert'>
                    {t`Minimum ${minDisplay}`}
                  </p>
                )}
                <FeePreview
                  fees={fees}
                  price={form.price}
                  currency={form.currency}
                  pricing={form.pricing}
                />
              </div>
              {form.pricing === 'subscription' && (
                <div className='space-y-1.5'>
                  <Label><Trans>Interval</Trans></Label>
                  <Select
                    value={form.interval}
                    onValueChange={(v) => update('interval', v as Interval)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t`Select interval`} />
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
              <h2 className='text-base font-semibold'><Trans>Auction</Trans></h2>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label><Trans>Duration</Trans></Label>
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
                  <Label htmlFor='startTime'><Trans>Start time</Trans></Label>
                  <Input
                    id='startTime'
                    type='datetime-local'
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <p className='text-xs text-muted-foreground'>
                    <Trans>Leave blank to start on publish.</Trans>
                  </p>
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reserve'>
                    {currencySymbol ? t`Reserve price (${currencySymbol})` : t`Reserve price`}
                  </Label>
                  <Input
                    id='reserve'
                    inputMode={currencyDecimals(form.currency) === 0 ? 'numeric' : 'decimal'}
                    placeholder={t`Optional`}
                    value={reserve}
                    aria-invalid={reserveInvalid}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val !== '' && !priceRegex(form.currency).test(val)) return
                      setReserve(val)
                    }}
                  />
                  {reserveBelowStart && (
                    <p className='text-xs text-destructive' role='alert'>
                      <Trans>Reserve price must be higher than the starting bid.</Trans>
                    </p>
                  )}
                  {!reserveBelowStart && reserveAboveInstant && (
                    <p className='text-xs text-destructive' role='alert'>
                      <Trans>Reserve price must not exceed the buy it now price.</Trans>
                    </p>
                  )}
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='instant'>
                    {currencySymbol ? t`Buy it now price (${currencySymbol})` : t`Buy it now price`}
                  </Label>
                  <Input
                    id='instant'
                    inputMode={currencyDecimals(form.currency) === 0 ? 'numeric' : 'decimal'}
                    placeholder={t`Optional`}
                    value={instantBuy}
                    aria-invalid={instantInvalid}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val !== '' && !priceRegex(form.currency).test(val)) return
                      setInstantBuy(val)
                    }}
                  />
                  {instantInvalid && (
                    <p className='text-xs text-destructive' role='alert'>
                      <Trans>Buy it now price must be higher than the starting bid.</Trans>
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Description */}
          <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
            <h2 className='text-base font-semibold'><Trans>Description</Trans></h2>
            <Textarea
              id='description'
              aria-label={t`Description`}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={6}
            />
            <div className='space-y-1.5 pt-2'>
              <Label><Trans>Tags</Trans></Label>
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
                  <Plus className="size-3.5" />
                  <Trans>Add</Trans>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type='button' aria-label={t`Remove tag`} onClick={() => removeTag(tag)}>
                            <X className='size-3' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{t`Remove tag`}</TooltipContent>
                      </Tooltip>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Photos */}
          <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
            <h2 className='text-base font-semibold'><Trans>Photos</Trans></h2>
            {photos.length > 1 && (
              <p className='text-muted-foreground text-xs'>
                <Trans>Drag a photo to change the order buyers see.</Trans>
              </p>
            )}
            <div className='grid grid-cols-3 gap-4' {...photoOrder.getGroupProps()}>
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  {...photoOrder.getItemProps(index)}
                  className={cn(
                    'group relative select-none',
                    photos.length > 1 && !photoOrder.saving && 'cursor-grab active:cursor-grabbing',
                    photoOrder.draggingIndex === index &&
                      'ring-primary z-10 scale-[1.04] rounded-lg shadow-lg ring-2',
                    photoOrder.saving && 'opacity-70'
                  )}
                >
                  <div className='aspect-square overflow-hidden rounded-lg bg-muted'>
                    <OwnedPhotoThumb photo={photo} />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='absolute right-1 top-1 size-6 opacity-0 group-hover:opacity-100'
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={photoOrder.saving}
                        aria-label={t`Delete photo`}
                      >
                        <Trash2 className='size-3' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t`Delete photo`}</TooltipContent>
                  </Tooltip>
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
            <UploadProgress progress={photoProgress} />
            <label className='inline-flex cursor-pointer items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                asChild
                disabled={uploading > 0 || photoOrder.saving}
              >
                <span>
                  {uploading > 0 ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Upload className='size-4' />
                  )}
                  {uploading > 0 ? t`Uploading ${uploading}...` : t`Upload photos`}
                </span>
              </Button>
              <input
                type='file'
                accept='image/*'
                multiple
                className='hidden'
                onChange={handlePhotoUpload}
                disabled={uploading > 0 || photoOrder.saving}
              />
            </label>
          </section>

          {/* Assets (digital only) */}
          {form.type === 'digital' && (
            <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
              <h2 className='text-base font-semibold'><Trans>Digital assets</Trans></h2>
              {(assets.length > 0 || uploadingAssets > 0) && (
                <div className='space-y-2' {...assetOrder.getGroupProps()}>
                  {assets.map((asset: Asset, index: number) => (
                    <div
                      key={asset.id}
                      {...assetOrder.getItemProps(index)}
                      className={cn(
                        'group flex items-center justify-between rounded-lg border p-3 text-sm select-none',
                        assets.length > 1 && !assetOrder.saving && 'cursor-grab active:cursor-grabbing',
                        assetOrder.draggingIndex === index &&
                          'ring-primary z-10 shadow-lg ring-2',
                        assetOrder.saving && 'opacity-70'
                      )}
                    >
                      <div className='flex items-center gap-2 min-w-0'>
                        {asset.hosting === 'external' && (
                          <ExternalLink className='size-3.5 shrink-0 text-muted-foreground' />
                        )}
                        <span className='truncate'>{asset.filename}</span>
                      </div>
                      <div className='flex items-center gap-2 shrink-0'>
                        <span className='text-muted-foreground'>
                          {asset.hosting === 'external' ? t`External` : formatFileSize(asset.size)}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-6 opacity-0 group-hover:opacity-100'
                              onClick={() => handleDeleteAsset(asset.id)}
                              disabled={assetOrder.saving}
                              aria-label={t`Delete asset`}
                            >
                              <Trash2 className='size-3' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t`Delete asset`}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: uploadingAssets }).map((_, i) => (
                    <div
                      key={`uploading-${i}`}
                      className='flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground'
                    >
                      <Loader2 className='size-4 animate-spin' />
                      <span><Trans>Uploading...</Trans></span>
                    </div>
                  ))}
                </div>
              )}
              <UploadProgress progress={assetProgress} />
              <div className='flex gap-2'>
                <label className='inline-flex cursor-pointer items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    asChild
                    disabled={uploadingAssets > 0 || assetOrder.saving}
                  >
                    <span>
                      {uploadingAssets > 0 ? (
                        <Loader2 className='size-4 animate-spin' />
                      ) : (
                        <Upload className='size-4' />
                      )}
                      {uploadingAssets > 0 ? t`Uploading ${uploadingAssets}...` : t`Upload file`}
                    </span>
                  </Button>
                  <input
                    type='file'
                    multiple
                    className='hidden'
                    onChange={handleAssetUpload}
                    disabled={uploadingAssets > 0 || assetOrder.saving}
                  />
                </label>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setAddingExternal(!addingExternal)}
                >
                  <ExternalLink className='size-4' />
                  <Trans>External URL</Trans>
                </Button>
              </div>
              {addingExternal && (
                <div className='space-y-2 rounded-lg border p-3'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='external-name'><Trans>Filename</Trans></Label>
                    <Input
                      id='external-name'
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      placeholder={t`e.g. my-album.zip`}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='external-url'><Trans>URL</Trans></Label>
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
                        toast.error(getErrorMessage(err, t`Failed to add external asset`))
                      }
                    }}
                  >
                    <Plus className="size-3.5" />
                    <Trans>Add</Trans>
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Delivery (physical only) */}
          {form.type === 'physical' && (
            <section className='space-y-4 rounded-lg border bg-card p-4 sm:p-6'>
              <h2 className='text-base font-semibold'><Trans>Delivery</Trans></h2>
              <div className='space-y-1.5'>
                <Label><Trans>Delivery methods</Trans></Label>
                <div className='flex items-center gap-6 ps-1'>
                  <div className='flex items-center gap-2'>
                    <Switch
                      id='shipping-switch'
                      checked={form.shipping}
                      onCheckedChange={(v) => update('shipping', v)}
                    />
                    <Label htmlFor='shipping-switch' className='font-normal'>
                      <Trans>Shipping</Trans>
                    </Label>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Switch
                      id='pickup-switch'
                      checked={form.pickup}
                      onCheckedChange={(v) => update('pickup', v)}
                    />
                    <Label htmlFor='pickup-switch' className='font-normal'>
                      <Trans>Pickup</Trans>
                    </Label>
                  </div>
                </div>
              </div>

              {form.shipping && (
                <div className='space-y-1.5'>
                  <Label><Trans>Shipping options</Trans></Label>
                  {shippingOptions.length > 0 && (
                    <div className='divide-y'>
                      <div className='grid grid-cols-[1fr_6rem_5rem_2rem] items-center gap-3 pb-1.5 text-xs text-muted-foreground'>
                        <span><Trans>Region</Trans></span>
                        <span>{currencySymbol ? t`Price (${currencySymbol})` : t`Price`}</span>
                        <span><Trans>Days</Trans></span>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='size-8'
                                onClick={() => removeShippingOption(i)}
                                aria-label={t`Remove shipping option`}
                              >
                                <Trash2 className='size-4' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t`Remove shipping option`}</TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant='outline' size='sm' onClick={addShippingOption} className='mt-2'>
                    <Plus className='me-1 size-4' /> <Trans>Add shipping option</Trans>
                  </Button>
                </div>
              )}

              <div className='space-y-1.5'>
                <Label><Trans>Location</Trans></Label>
                {(() => {
                  const parsed = parseLocation(form.location)
                  if (parsed) {
                    return (
                      <div className='flex items-center gap-2 rounded-lg border px-3 py-2 text-sm'>
                        <MapPin className='size-4 text-muted-foreground' />
                        <span className='flex-1'>{parsed.name}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type='button'
                              aria-label={t`Clear location`}
                              onClick={() => update('location', '')}
                              className='text-muted-foreground hover:text-foreground'
                            >
                              <X className='size-4' />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t`Clear location`}</TooltipContent>
                        </Tooltip>
                      </div>
                    )
                  }
                  return (
                    <Button
                      variant='outline'
                      className='w-full justify-start text-muted-foreground'
                      onClick={() => setPlacePicker(true)}
                    >
                      <MapPin className='me-2 size-4' />
                      <Trans>Set location</Trans>
                    </Button>
                  )
                })()}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='information'><Trans>Delivery information</Trans></Label>
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
              <DialogTitle><Trans>Publish listing</Trans></DialogTitle>
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
                <Trans>
                  When you publish, your listing goes through an automated check.
                  Most listings go live immediately; some are held for Mochi staff
                  to review before they become visible.
                </Trans>
              </p>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setPublishOpen(false)}
                disabled={publishing}
              >
                <Trans>Cancel</Trans>
              </Button>
              <Button onClick={handlePublish} disabled={publishing}>
                <Send className='size-4' />
                {publishing ? t`Publishing...` : t`Publish`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle><Trans>Delete draft?</Trans></DialogTitle>
            </DialogHeader>
            <p className='text-sm py-2'>
              <Trans>This draft listing will be permanently removed.</Trans>
            </p>
            <DialogFooter>
              <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={deleting}>
                <Trans>Cancel</Trans>
              </Button>
              <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
                {deleting ? t`Deleting...` : t`Delete`}
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
  // A subscription listing is meaningless without its billing period, and the
  // form offers the field - it just was not among the things publish checked,
  // so a seller could publish a subscription with no interval set.
  if (form.pricing === 'subscription' && !form.interval) missing.push('interval')
  return missing
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  if (status === 'saving') {
    return (
      <span className='flex items-center gap-1 text-xs text-muted-foreground'>
        <Loader2 className='size-3 animate-spin' />
        <Trans>Saving...</Trans>
      </span>
    )
  }
  return (
    <span className='flex items-center gap-1 text-xs text-muted-foreground'>
      <Check className='size-3' />
      <Trans>Saved</Trans>
    </span>
  )
}
