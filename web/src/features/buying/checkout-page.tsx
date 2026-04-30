import { useState } from 'react'
import { useLoaderData, useNavigate } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  getAppPath,
  getErrorMessage,
  shellNavigateTop,
  usePageTitle,
} from '@mochi/web'
import { ordersApi } from '@/api/orders'
import { subscriptionsApi } from '@/api/subscriptions'
import { useFormatPrice, toMinorUnits, currencyDecimals, priceRegex } from '@/lib/format'
import { DELIVERY_METHODS } from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'

export function CheckoutPage() {
  const formatPrice = useFormatPrice()
  usePageTitle('Checkout')
  const { data, error } = useLoaderData({
    from: '/_authenticated/checkout/$listingId',
  })
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState(() => {
    const methods = DELIVERY_METHODS.filter((d) => {
      if (d.value === 'shipping' && !data?.listing?.shipping) return false
      if (d.value === 'pickup' && !data?.listing?.pickup) return false
      if (d.value === 'download' && data?.listing?.type !== 'digital') return false
      return true
    })
    return methods.length === 1 ? methods[0].value : ''
  })
  const [option, setOption] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  // Address fields
  const [addressName, setAddressName] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressRegion, setAddressRegion] = useState('')
  const [addressPostcode, setAddressPostcode] = useState('')
  const [addressCountry, setAddressCountry] = useState('')

  if (error) {
    return (
      <>
        <PageHeader icon={<ShoppingCart className='size-4 md:size-5' />} title='Checkout' />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader icon={<ShoppingCart className='size-4 md:size-5' />} title='Checkout' />
        <Main>
          <EmptyState icon={ShoppingCart} title='Listing not found' />
        </Main>
      </>
    )
  }

  const { listing, shipping, auction } = data

  const itemPrice =
    listing.pricing === 'pwyw' && amount
      ? toMinorUnits(amount, listing.currency)
      : listing.pricing === 'auction'
        ? auction?.bid || 0
        : listing.price
  const selectedShippingOption = shipping?.find((s) => s.id === Number(option))
  const total = itemPrice + (selectedShippingOption?.price || 0)

  // Handle subscription
  if (listing.pricing === 'subscription') {
    async function handleSubscribe() {
      setLoading(true)
      try {
        const base = window.location.origin + getAppPath()
        const result = await subscriptionsApi.create({
          listing: listing.id,
          success_url: `${base}/subscriptions`,
          cancel_url: `${base}/listings/${listing.id}`,
        })
        if (result.checkout_url) {
          shellNavigateTop(result.checkout_url)
        } else {
          toast.error('Payment checkout could not be started — the seller may not have completed payment setup')
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to subscribe'))
      } finally {
        setLoading(false)
      }
    }

    return (
      <>
        <PageHeader
          icon={<ShoppingCart className='size-4 md:size-5' />}
          title='Subscribe'
          back={{ label: 'Back', onFallback: () => navigate({ to: APP_ROUTES.LISTINGS.VIEW(listing.id) }) }}
        />
        <Main>
          <div className='mx-auto max-w-lg space-y-4'>
            <Card className='rounded-lg'>
              <CardContent className='space-y-3 p-5'>
                <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  You are subscribing to
                </p>
                <h3 className='text-base font-semibold leading-snug'>
                  {listing.title}
                </h3>
                <div className='flex items-baseline gap-1 border-t border-border pt-3'>
                  <span className='text-2xl font-bold tabular-nums'>
                    {formatPrice(listing.price, listing.currency)}
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    {listing.interval === 'yearly' ? '/ year' : '/ month'}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Button
              className='h-11 w-full'
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </div>
        </Main>
      </>
    )
  }

  // Determine available delivery methods
  const available = DELIVERY_METHODS.filter((d) => {
    if (d.value === 'shipping' && !listing.shipping) return false
    if (d.value === 'pickup' && !listing.pickup) return false
    if (d.value === 'download' && listing.type !== 'digital') return false
    return true
  })

  async function handleCreateOrder() {
    setLoading(true)
    try {
      const base = window.location.origin + getAppPath()
      const params: Record<string, unknown> = {
        listing: listing.id,
        delivery,
        success_url: `${base}/purchases/__ORDER_ID__`,
        cancel_url: `${base}/listings/${listing.id}`,
      }
      if (delivery === 'shipping' && option) {
        params.option = Number(option)
        params.address_name = addressName
        params.address_line1 = addressLine1
        params.address_line2 = addressLine2
        params.address_city = addressCity
        params.address_region = addressRegion
        params.address_postcode = addressPostcode
        params.address_country = addressCountry
      }
      if (listing.pricing === 'pwyw' && amount) {
        const amountMinor = toMinorUnits(amount, listing.currency)
        if (amountMinor < listing.price) {
          toast.error(`Amount must be at least ${formatPrice(listing.price, listing.currency)}`)
          setLoading(false)
          return
        }
        params.amount = amountMinor
      }

      const result = listing.pricing === 'auction'
        ? await ordersApi.auction(params)
        : await ordersApi.create(params)
      if (result.checkout_url) {
        shellNavigateTop(result.checkout_url)
      } else if (result.order?.id) {
        // Free order — completed without Stripe
        navigate({ to: APP_ROUTES.PURCHASE(result.order.id) })
      } else {
        toast.error('Payment checkout could not be started — the seller may not have completed payment setup')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create order'))
    } finally {
      setLoading(false)
    }
  }

  const selectedShipping = shipping.find((s) => String(s.id) === option)

  return (
    <>
      <PageHeader
        icon={<ShoppingCart className='size-4 md:size-5' />}
        title='Checkout'
        back={{ label: 'Back', onFallback: () => navigate({ to: APP_ROUTES.LISTINGS.VIEW(listing.id) }) }}
      />
      <Main>
        <div className='grid grid-cols-1 gap-6 pb-16 lg:grid-cols-[1fr_22rem]'>
          <div className='min-w-0 space-y-4 lg:order-1'>
            <Card className='rounded-lg'>
              <CardContent className='flex items-center gap-3 p-3 sm:gap-4 sm:p-4'>
                <span className='inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-14'>
                  <ShoppingCart className='size-5 sm:size-6' />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs'>
                    Item
                  </p>
                  <h3 className='line-clamp-2 text-sm font-semibold sm:text-base'>
                    {listing.title}
                  </h3>
                </div>
                <span className='shrink-0 text-base font-semibold tabular-nums sm:text-lg'>
                  {formatPrice(itemPrice, listing.currency)}
                </span>
              </CardContent>
            </Card>

          {listing.pricing === 'pwyw' && (
            <div>
              <Label htmlFor='amount'>
                Your price (minimum{' '}
                {formatPrice(listing.price, listing.currency)})
              </Label>
              <Input
                id='amount'
                type='text'
                inputMode={currencyDecimals(listing.currency) === 0 ? 'numeric' : 'decimal'}
                value={amount}
                onChange={(e) => {
                  const val = e.target.value
                  if (val !== '' && !priceRegex(listing.currency).test(val)) return
                  setAmount(val)
                }}
              />
            </div>
          )}

          {available.length > 1 && (
            <div>
              <Label>Delivery method</Label>
              <Select value={delivery} onValueChange={setDelivery}>
                <SelectTrigger>
                  <SelectValue placeholder='Select delivery' />
                </SelectTrigger>
                <SelectContent>
                  {available.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {delivery === 'shipping' && shipping.length > 0 && (
            <>
              <div>
                <Label>Shipping option</Label>
                <Select value={option} onValueChange={setOption}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select shipping' />
                  </SelectTrigger>
                  <SelectContent>
                    {shipping.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.region} &mdash;{' '}
                        {formatPrice(s.price, s.currency)}
                        {s.days && ` (${s.days} days)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-3'>
                <h3 className='text-sm font-medium'>Shipping address</h3>
                <div>
                  <Label htmlFor='aName'>Name</Label>
                  <Input
                    id='aName'
                    value={addressName}
                    onChange={(e) => setAddressName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='aLine1'>Address line 1</Label>
                  <Input
                    id='aLine1'
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='aLine2'>Address line 2</Label>
                  <Input
                    id='aLine2'
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                  />
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div>
                    <Label htmlFor='aCity'>City</Label>
                    <Input
                      id='aCity'
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor='aRegion'>Region</Label>
                    <Input
                      id='aRegion'
                      value={addressRegion}
                      onChange={(e) => setAddressRegion(e.target.value)}
                    />
                  </div>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div>
                    <Label htmlFor='aPostcode'>Postcode</Label>
                    <Input
                      id='aPostcode'
                      value={addressPostcode}
                      onChange={(e) => setAddressPostcode(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor='aCountry'>Country</Label>
                    <Input
                      id='aCountry'
                      value={addressCountry}
                      onChange={(e) => setAddressCountry(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          </div>

          {/* Order summary sidebar */}
          <aside className='min-w-0 space-y-4 lg:order-2 lg:sticky lg:top-[calc(var(--sticky-top,0px)+4rem)] lg:self-start'>
            <Card className='rounded-lg'>
              <CardContent className='space-y-4 p-5'>
                <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  Order summary
                </p>
                <div className='space-y-1'>
                  <h3 className='text-base font-semibold leading-snug'>
                    {listing.title}
                  </h3>
                  {auction && (
                    <p className='text-xs text-muted-foreground'>
                      {auction.instant > 0 && auction.bid === auction.instant
                        ? 'Buy it now'
                        : 'Winning bid'}
                    </p>
                  )}
                </div>

                <div className='space-y-2 border-t border-border pt-3 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Item</span>
                    <span className='tabular-nums'>
                      {formatPrice(itemPrice, listing.currency)}
                    </span>
                  </div>
                  {selectedShipping ? (
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Shipping</span>
                      <span className='tabular-nums'>
                        {formatPrice(
                          selectedShipping.price,
                          selectedShipping.currency,
                        )}
                      </span>
                    </div>
                  ) : (
                    delivery === 'shipping' && (
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Shipping</span>
                        <span className='text-muted-foreground'>
                          Select option
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div className='flex items-baseline justify-between border-t border-border pt-3'>
                  <span className='text-sm font-medium'>Total</span>
                  <span className='text-2xl font-bold tabular-nums'>
                    {formatPrice(total, listing.currency)}
                  </span>
                </div>

                <Button
                  className='h-11 w-full'
                  onClick={handleCreateOrder}
                  disabled={loading || !delivery}
                >
                  {loading
                    ? 'Processing...'
                    : total === 0
                      ? 'Get it free'
                      : 'Proceed to payment'}
                </Button>

                <p className='text-center text-xs text-muted-foreground'>
                  Secure payment via Stripe
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </Main>
    </>
  )
}
