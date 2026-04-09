import { useState } from 'react'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import {
  Check,
  Edit,
  ExternalLink,
  MapPin,
  Send,
  Trash2,
  Upload,
  Plus,
  X,
  LoaderCircle,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  GeneralError,
  Input,
  Label,
  Main,
  PageHeader,
  PlacePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
  Textarea,
  toast,
  getErrorMessage,
  usePageTitle,
  type PlaceData,
} from '@mochi/web'
import type { Asset, Photo, ShippingOption } from '@/types'
import { listingsApi } from '@/api/listings'
import { photosApi } from '@/api/photos'
import { assetsApi } from '@/api/assets'
import { getThumbnailUrl } from '@/lib/photos'
import { parseLocation } from '@/lib/format'
import {
  CONDITIONS,
  CURRENCIES,
  INTERVALS,
  LISTING_TYPES,
  PRICING_MODELS,
} from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'

export function EditListingPage() {
  const { detail, photos: initialPhotos, error } = useLoaderData({
    from: '/_authenticated/listings/$listingId_/edit',
  })
  const navigate = useNavigate()
  const { tab } = useSearch({ from: '/_authenticated/listings/$listingId_/edit' })
  const activeTab = tab ?? 'details'
  const setActiveTab = (value: string) => {
    void navigate({ search: { tab: value } as never, replace: true })
  }
  const listing = detail?.listing
  usePageTitle(listing?.title ? `Edit ${listing.title}` : 'Edit listing')
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ?? [])
  const [assets, setAssets] = useState<Asset[]>(detail?.assets ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [uploadingAssets, setUploadingAssets] = useState(0)
  const [externalUrl, setExternalUrl] = useState('')
  const [externalName, setExternalName] = useState('')
  const [addingExternal, setAddingExternal] = useState(false)

  // Form state
  const [title, setTitle] = useState(listing?.title ?? '')
  const [description, setDescription] = useState(listing?.description ?? '')
  const [category, _setCategory] = useState(String(listing?.category ?? '0'))
  const [condition, setCondition] = useState(listing?.condition ?? '')
  const [type, setType] = useState(listing?.type ?? '')
  const [pricing, setPricing] = useState<string>(listing?.pricing || 'fixed')
  const [price, setPrice] = useState(
    listing?.price ? String(listing.price / 100) : ''
  )
  const [currency, setCurrency] = useState<string>(listing?.currency || 'gbp')
  const [interval, setInterval_] = useState(listing?.interval ?? '')
  const [quantity, setQuantity] = useState(String(listing?.quantity ?? ''))
  const [location, setLocation] = useState(listing?.location ?? '')
  const [placePicker, setPlacePicker] = useState(false)
  const [information, setInformation] = useState(listing?.information ?? '')
  const [tags, setTags] = useState<string[]>(() => {
    try {
      return listing?.tags ? JSON.parse(listing.tags) : []
    } catch {
      return []
    }
  })
  const [tagInput, setTagInput] = useState('')
  const [pickup, setPickup] = useState(!!listing?.pickup)
  const [shipping, setShipping] = useState(!!listing?.shipping)

  // Shipping options
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(
    () =>
      (detail?.shipping ?? []).map((opt) => ({
        ...opt,
        price: opt.price ? String(opt.price / 100) as unknown as number : 0,
        currency: opt.currency || listing?.currency || 'gbp',
      }))
  )

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

  async function saveDetails() {
    if (!listing) return
    setSaving(true)
    try {
      await listingsApi.update({
        id: listing.id,
        title,
        description,
        category: Number(category),
        condition,
        type,
        pricing,
        price: Math.round(Number(price) * 100),
        currency,
        interval,
        quantity: Number(quantity) || 0,
        location,
        information,
        tags: JSON.stringify(tags),
        pickup: pickup ? 1 : 0,
        shipping: shipping ? 1 : 0,
      })
      toast.success('Saved')
      setSaved(true)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save'))
    } finally {
      setSaving(false)
    }
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

  async function handleSaveShipping() {
    if (!listing) return
    try {
      const options = shippingOptions.map((opt) => ({
        region: opt.region,
        price: Math.round((Number(opt.price) || 0) * 100),
        currency: opt.currency,
        days: opt.days,
        notes: opt.notes,
      }))
      await listingsApi.update({ id: listing.id, shipping: shipping ? 1 : 0 })
      const { client } = await import('@/api/client')
      const { endpoints } = await import('@/api/endpoints')
      await client.post(endpoints.shipping.set, {
        listing: listing.id,
        options: JSON.stringify(options),
      })
      toast.success('Shipping options saved')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save shipping'))
    }
  }

  async function handlePublish() {
    if (!listing) return
    setSaving(true)
    try {
      await listingsApi.publish({ id: listing.id })
      toast.success('Listing published')
      navigate({ to: APP_ROUTES.LISTINGS.VIEW(listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to publish'))
    } finally {
      setSaving(false)
    }
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  function addShippingOption() {
    setShippingOptions([
      ...shippingOptions,
      {
        id: 0,
        listing: listing?.id ?? 0,
        region: '',
        price: 0,
        currency: currency,
        days: '',
        notes: '',
      },
    ])
  }

  return (
    <>
      <PageHeader
        icon={<Edit className='size-4 md:size-5' />}
        title='Edit listing'
        back={{ label: 'My listings', onFallback: () => navigate({ to: APP_ROUTES.LISTINGS.MINE }) }}
      />
      <Main>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='max-w-2xl'>
          <TabsList>
            <TabsTrigger value='details'>Details</TabsTrigger>
            <TabsTrigger value='photos'>Photos</TabsTrigger>
            <TabsTrigger value='assets'>Assets</TabsTrigger>
            <TabsTrigger value='shipping'>Shipping</TabsTrigger>
            <TabsTrigger value='publish'>Publish</TabsTrigger>
          </TabsList>

          <TabsContent value='details' className='space-y-4 mt-4'>
            <div>
              <Label htmlFor='title'>Title</Label>
              <Input
                id='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
              />
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select type' />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type !== 'digital' && (
                <div>
                  <Label>Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
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
              <div>
                <Label>Pricing</Label>
                <Select value={pricing} onValueChange={setPricing}>
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
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
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
              <div>
                <Label htmlFor='price'>
                  {CURRENCIES.find((c) => c.value === currency)?.symbol ? `Price (${CURRENCIES.find((c) => c.value === currency)!.symbol})` : 'Price'}
                </Label>
                <Input
                  id='price'
                  inputMode='decimal'
                  value={price}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return
                    setPrice(val)
                  }}
                />
              </div>
              {pricing === 'subscription' && (
                <div>
                  <Label>Interval</Label>
                  <Select value={interval} onValueChange={setInterval_}>
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
              {type !== 'digital' && (
                <div>
                  <Label htmlFor='quantity'>Quantity (0 = unlimited)</Label>
                  <Input
                    id='quantity'
                    type='number'
                    min='0'
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              )}
              {type !== 'digital' && (
                <div>
                  <Label>Location</Label>
                  {(() => {
                    const parsed = parseLocation(location)
                    if (parsed) {
                      return (
                        <div className='mt-1 flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm'>
                          <MapPin className='size-4 text-muted-foreground' />
                          <span className='flex-1'>{parsed.name}</span>
                          <button
                            type='button'
                            onClick={() => setLocation('')}
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
                        className='mt-1 w-full justify-start text-muted-foreground'
                        onClick={() => setPlacePicker(true)}
                      >
                        <MapPin className='mr-2 size-4' />
                        Set location
                      </Button>
                    )
                  })()}
                </div>
              )}
            </div>

            {type !== 'digital' && (
              <div>
                <Label>Delivery methods</Label>
                <div className='space-y-2 mt-1 pl-1'>
                  <div className='flex items-center gap-2'>
                    <Switch id='shipping-switch' checked={shipping} onCheckedChange={setShipping} />
                    <Label htmlFor='shipping-switch' className='font-normal'>Shipping</Label>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Switch id='pickup-switch' checked={pickup} onCheckedChange={setPickup} />
                    <Label htmlFor='pickup-switch' className='font-normal'>Pickup</Label>
                  </div>
                </div>
              </div>
            )}

            <div>
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
              {tags.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-2'>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className='inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs'
                    >
                      {tag}
                      <button
                        onClick={() =>
                          setTags(tags.filter((t) => t !== tag))
                        }
                      >
                        <X className='size-3' />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {type !== 'digital' && (
              <div>
                <Label htmlFor='information'>Delivery information</Label>
                <Textarea
                  id='information'
                  value={information}
                  onChange={(e) => setInformation(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className='flex items-center gap-3'>
              <Button onClick={saveDetails} disabled={saving}>
                <Check className='size-4' />
                {saving ? 'Saving...' : 'Save details'}
              </Button>
              {listing?.status === 'draft' && saved && (
                <Button variant='outline' onClick={() => setActiveTab('publish')}>
                  <Send className='size-4' />
                  Publish
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value='photos' className='space-y-4 mt-4'>
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
                <div key={`uploading-${i}`} className='flex aspect-square items-center justify-center rounded-[10px] border border-dashed'>
                  <LoaderCircle className='size-6 animate-spin text-muted-foreground' />
                </div>
              ))}
            </div>
            <label className='inline-flex cursor-pointer items-center gap-2'>
              <Button variant='outline' size='sm' asChild disabled={uploading > 0}>
                <span>
                  {uploading > 0 ? (
                    <LoaderCircle className='size-4 animate-spin' />
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
          </TabsContent>

          <TabsContent value='assets' className='space-y-4 mt-4'>
            {(assets.length > 0 || uploadingAssets > 0) && (
              <div className='space-y-2'>
                {assets.map((asset: Asset) => (
                  <div
                    key={asset.id}
                    className='group flex items-center justify-between rounded-[10px] border p-3 text-sm'
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      {asset.hosting === 'external' && <ExternalLink className='size-3.5 shrink-0 text-muted-foreground' />}
                      <span className='truncate'>{asset.filename}</span>
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                      <span className='text-muted-foreground'>
                        {asset.hosting === 'external' ? 'External' : asset.size >= 1048576 ? `${(asset.size / 1048576).toFixed(1)} MB` : `${Math.round(asset.size / 1024)} KB`}
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
                    <LoaderCircle className='size-4 animate-spin' />
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
                      <LoaderCircle className='size-4 animate-spin' />
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
                <div>
                  <Label htmlFor='external-name'>Filename</Label>
                  <Input
                    id='external-name'
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    placeholder='e.g. my-album.zip'
                  />
                </div>
                <div>
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
          </TabsContent>

          <TabsContent value='shipping' className='space-y-4 mt-4'>
            {shippingOptions.length > 0 && (
              <div className='divide-y'>
                <div className='grid grid-cols-[1fr_6rem_5rem_2rem] items-center gap-3 pb-1.5 text-xs text-muted-foreground'>
                  <span>Region</span>
                  <span>{CURRENCIES.find((c) => c.value === currency)?.symbol ? `Price (${CURRENCIES.find((c) => c.value === currency)!.symbol})` : 'Price'}</span>
                  <span>Days</span>
                  <span />
                </div>
                {shippingOptions.map((opt, i) => (
                  <div key={i} className='grid grid-cols-[1fr_6rem_5rem_2rem] items-center gap-3 py-2'>
                    <Input
                      value={opt.region}
                      onChange={(e) => {
                        const next = [...shippingOptions]
                        next[i] = { ...next[i], region: e.target.value }
                        setShippingOptions(next)
                      }}
                    />
                    <Input
                      inputMode='decimal'
                      value={opt.price || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return
                        const next = [...shippingOptions]
                        next[i] = { ...next[i], price: val as unknown as number }
                        setShippingOptions(next)
                      }}
                    />
                    <Input
                      value={opt.days}
                      onChange={(e) => {
                        const next = [...shippingOptions]
                        next[i] = { ...next[i], days: e.target.value }
                        setShippingOptions(next)
                      }}
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8'
                      onClick={() =>
                        setShippingOptions(
                          shippingOptions.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={addShippingOption}
              >
                <Plus className='mr-1 size-4' /> Add shipping option
              </Button>
              <Button size='sm' onClick={handleSaveShipping}>
                Save shipping
              </Button>
            </div>
          </TabsContent>

          <TabsContent value='publish' className='space-y-4 mt-4'>
            <Card className='rounded-[10px]'>
              <CardContent className='p-4 space-y-2'>
                <h3 className='font-medium'>Publish checklist</h3>
                <ul className='space-y-1 text-sm'>
                  <li className={title ? 'text-green-600' : 'text-red-500'}>
                    {title ? '\u2713' : '\u2717'} Title
                  </li>
                  <li className={type ? 'text-green-600' : 'text-red-500'}>
                    {type ? '\u2713' : '\u2717'} Type
                  </li>
                  <li className={pricing ? 'text-green-600' : 'text-red-500'}>
                    {pricing ? '\u2713' : '\u2717'} Pricing
                  </li>
                  <li className={currency ? 'text-green-600' : 'text-red-500'}>
                    {currency ? '\u2713' : '\u2717'} Currency
                  </li>
                  <li
                    className={
                      photos.length > 0
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }
                  >
                    {photos.length > 0 ? '\u2713' : '-'} Photos (
                    {photos.length})
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Button onClick={handlePublish} disabled={saving}>
              <Send className='mr-1 size-4' />
              {saving ? 'Publishing...' : 'Publish listing'}
            </Button>
          </TabsContent>
        </Tabs>

        <PlacePicker
          open={placePicker}
          onOpenChange={setPlacePicker}
          onSelect={(place: PlaceData) => {
            setLocation(JSON.stringify(place))
            setPlacePicker(false)
          }}
        />
      </Main>
    </>
  )
}
