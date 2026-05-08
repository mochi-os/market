import { useEffect, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
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
import { countryInRegion } from '@/lib/shipping'
import { useDeliveryMethods } from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'

export function CheckoutPage() {
  const { t } = useLingui()
  const formatPrice = useFormatPrice()
  const DELIVERY_METHODS = useDeliveryMethods()
  usePageTitle(t`Checkout`)
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

  // Auto-pick the cheapest shipping option that covers the buyer's country.
  // Coverage uses countryInRegion (lib/shipping.ts) which handles exact
  // match, catch-all regions, and major continent/EU groups so that
  // "Germany" matches a "Europe" zone rather than falling through to
  // "Worldwide". The dropdown stays editable for any miss.
  const shippingOptions = useMemo(() => data?.shipping ?? [], [data?.shipping])
  useEffect(() => {
    const country = addressCountry.trim()
    if (!country || shippingOptions.length === 0) return
    const eligible = shippingOptions.filter((s) => countryInRegion(country, s.region))
    if (eligible.length === 0) return
    const cheapest = eligible.slice().sort((a, b) => a.price - b.price)[0]
    setOption(String(cheapest.id))
  }, [addressCountry, shippingOptions])

  if (error) {
    return (
      <>
        <PageHeader icon={<ShoppingCart className='size-4 md:size-5' />} title={t`Checkout`} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader icon={<ShoppingCart className='size-4 md:size-5' />} title={t`Checkout`} />
        <Main>
          <EmptyState icon={ShoppingCart} title={t`Listing not found`} />
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
          toast.error(t`Payment checkout could not be started — the seller may not have completed payment setup`)
        }
      } catch (err) {
        toast.error(getErrorMessage(err, t`Failed to subscribe`))
      } finally {
        setLoading(false)
      }
    }

    return (
      <>
        <PageHeader
          icon={<ShoppingCart className='size-4 md:size-5' />}
          title={t`Subscribe`}
          back={{ label: t`Back`, onFallback: () => navigate({ to: APP_ROUTES.LISTINGS.VIEW(listing.id) }) }}
        />
        <Main>
          <div className='mx-auto max-w-lg space-y-4'>
            <Card className='rounded-lg'>
              <CardContent className='space-y-3 p-5'>
                <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  <Trans>You are subscribing to</Trans>
                </p>
                <h3 className='text-base font-semibold leading-snug'>
                  {listing.title}
                </h3>
                <div className='flex items-baseline gap-1 border-t border-border pt-3'>
                  <span className='text-2xl font-bold tabular-nums'>
                    {formatPrice(listing.price, listing.currency)}
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    {listing.interval === 'yearly' ? <Trans>/ year</Trans> : <Trans>/ month</Trans>}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Button
              className='h-11 w-full'
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? t`Subscribing...` : t`Subscribe`}
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
        success_url: `${base}/purchases?paid=1`,
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
          toast.error(t`Amount must be at least ${formatPrice(listing.price, listing.currency)}`)
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
        toast.error(t`Payment checkout could not be started — the seller may not have completed payment setup`)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to create order`))
    } finally {
      setLoading(false)
    }
  }

  const selectedShipping = shipping.find((s) => String(s.id) === option)

  return (
    <>
      <PageHeader
        icon={<ShoppingCart className='size-4 md:size-5' />}
        title={t`Checkout`}
        back={{ label: t`Back`, onFallback: () => navigate({ to: APP_ROUTES.LISTINGS.VIEW(listing.id) }) }}
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
                    <Trans>Item</Trans>
                  </p>
                  <h3 className='line-clamp-2 text-sm font-semibold sm:text-base'>
                    {listing.title}
                  </h3>
                  {auction && (
                    <p className='text-xs text-muted-foreground'>
                      {auction.instant > 0 && auction.bid === auction.instant
                        ? t`Buy it now`
                        : t`Winning bid`}
                    </p>
                  )}
                </div>
                <span className='shrink-0 text-base font-semibold tabular-nums sm:text-lg'>
                  {formatPrice(itemPrice, listing.currency)}
                </span>
              </CardContent>
            </Card>

            {listing.pricing === 'pwyw' && (
              <div>
                <Label htmlFor='amount'>
                  <Trans>
                    Your price (minimum{' '}
                    {formatPrice(listing.price, listing.currency)})
                  </Trans>
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
                <Label><Trans>Delivery method</Trans></Label>
                <Select value={delivery} onValueChange={setDelivery}>
                  <SelectTrigger>
                    <SelectValue placeholder={t`Select delivery`} />
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
                <div className='space-y-3'>
                  <h3 className='text-sm font-medium'><Trans>Shipping address</Trans></h3>
                  <div>
                    <Label htmlFor='aCountry'><Trans>Country</Trans></Label>
                    <Input
                      id='aCountry'
                      value={addressCountry}
                      onChange={(e) => setAddressCountry(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor='aName'><Trans>Name</Trans></Label>
                    <Input
                      id='aName'
                      value={addressName}
                      onChange={(e) => setAddressName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor='aLine1'><Trans>Address line 1</Trans></Label>
                    <Input
                      id='aLine1'
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor='aLine2'><Trans>Address line 2</Trans></Label>
                    <Input
                      id='aLine2'
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                    />
                  </div>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div>
                      <Label htmlFor='aCity'><Trans>City</Trans></Label>
                      <Input
                        id='aCity'
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor='aRegion'><Trans>Region</Trans></Label>
                      <Input
                        id='aRegion'
                        value={addressRegion}
                        onChange={(e) => setAddressRegion(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor='aPostcode'><Trans>Postcode</Trans></Label>
                    <Input
                      id='aPostcode'
                      value={addressPostcode}
                      onChange={(e) => setAddressPostcode(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label><Trans>Shipping option</Trans></Label>
                  <Select value={option} onValueChange={setOption}>
                    <SelectTrigger>
                      <SelectValue placeholder={t`Enter your country to see shipping options`} />
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
              </>
            )}
          </div>

          {/* Order summary sidebar */}
          <aside className='min-w-0 space-y-4 lg:order-2 lg:sticky lg:top-[calc(var(--sticky-top,0px)+4rem)] lg:self-start'>
            <Card className='rounded-lg'>
              <CardContent className='space-y-4 p-5'>
                <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  <Trans>Order summary</Trans>
                </p>
                <div className='space-y-1'>
                  <h3 className='text-base font-semibold leading-snug'>
                    {listing.title}
                  </h3>
                  {auction && (
                    <p className='text-xs text-muted-foreground'>
                      {auction.instant > 0 && auction.bid === auction.instant
                        ? t`Buy it now`
                        : t`Winning bid`}
                    </p>
                  )}
                </div>

                <div className='space-y-2 border-t border-border pt-3 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'><Trans>Item</Trans></span>
                    <span className='tabular-nums'>
                      {formatPrice(itemPrice, listing.currency)}
                    </span>
                  </div>
                  {selectedShipping ? (
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'><Trans>Shipping</Trans></span>
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
                        <span className='text-muted-foreground'><Trans>Shipping</Trans></span>
                        <span className='text-muted-foreground'>
                          <Trans>Select option</Trans>
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div className='flex items-baseline justify-between border-t border-border pt-3'>
                  <span className='text-sm font-medium'><Trans>Total</Trans></span>
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
                    ? t`Processing...`
                    : total === 0
                      ? t`Get it free`
                      : t`Proceed to payment`}
                </Button>

                <p className='text-center text-xs text-muted-foreground'>
                  <Trans>Secure payment via Stripe</Trans>
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </Main>
    </>
  )
}
