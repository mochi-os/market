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
  getErrorMessage,
  usePageTitle,
} from '@mochi/web'
import { ordersApi } from '@/api/orders'
import { subscriptionsApi } from '@/api/subscriptions'
import { formatPrice } from '@/lib/format'
import { DELIVERY_METHODS } from '@/config/constants'
import { APP_ROUTES } from '@/config/routes'

export function CheckoutPage() {
  usePageTitle('Checkout')
  const { data, error } = useLoaderData({
    from: '/_authenticated/checkout/$listingId',
  })
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState(() => {
    const methods = DELIVERY_METHODS.filter((d) => {
      if (d.value === 'shipping' && !data?.listing?.shipping) return false
      if (d.value === 'pickup' && !data?.listing?.pickup) return false
      if (d.value === 'download' && data?.listing?.type !== 'digital' && data?.listing?.type !== 'both') return false
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

  const { listing, shipping } = data

  // Handle subscription
  if (listing.pricing === 'subscription') {
    async function handleSubscribe() {
      setLoading(true)
      try {
        await subscriptionsApi.create(listing.id)
        toast.success('Subscribed')
        navigate({ to: APP_ROUTES.SUBSCRIPTIONS })
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
          <div className='max-w-md space-y-4'>
            <Card className='rounded-[10px]'>
              <CardContent className='p-4 space-y-2'>
                <h3 className='font-medium'>{listing.title}</h3>
                <p className='text-lg font-semibold'>
                  {formatPrice(listing.price, listing.currency)}/
                  {listing.interval === 'yearly' ? 'yr' : 'mo'}
                </p>
              </CardContent>
            </Card>
            <Button
              className='w-full'
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
    if (
      d.value === 'download' &&
      listing.type !== 'digital' &&
      listing.type !== 'both'
    )
      return false
    return true
  })

  async function handleCreateOrder() {
    setLoading(true)
    try {
      const origin = window.location.origin
      const params: Record<string, unknown> = {
        listing: listing.id,
        delivery,
        success_url: origin + '/market/purchases',
        cancel_url: origin + '/market/listings/' + listing.id,
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
        params.amount = Math.round(Number(amount) * 100)
      }

      const result = await ordersApi.create(params)
      if (result.checkout_url) {
        // Navigate the top-level page to Stripe's checkout
        // Use parent.postMessage for shell, or direct location for standalone
        window.parent.postMessage({ type: 'navigate-top', url: result.checkout_url }, '*')
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
        <div className='max-w-md space-y-4'>
          <Card className='rounded-[10px]'>
            <CardContent className='p-4 space-y-2'>
              <h3 className='font-medium'>{listing.title}</h3>
              <p className='text-lg font-semibold'>
                {formatPrice(listing.price, listing.currency)}
              </p>
            </CardContent>
          </Card>

          {listing.pricing === 'pwyw' && (
            <div>
              <Label htmlFor='amount'>
                Your price (min{' '}
                {formatPrice(listing.price, listing.currency)})
              </Label>
              <Input
                id='amount'
                type='number'
                step='0.01'
                min={listing.price / 100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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

          {selectedShipping && (
            <div className='rounded-[10px] bg-muted p-3 text-sm'>
              <div className='flex justify-between'>
                <span>Item</span>
                <span>{formatPrice(listing.price, listing.currency)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Shipping</span>
                <span>
                  {formatPrice(selectedShipping.price, selectedShipping.currency)}
                </span>
              </div>
              <div className='mt-1 flex justify-between border-t pt-1 font-medium'>
                <span>Total</span>
                <span>
                  {formatPrice(
                    listing.price + selectedShipping.price,
                    listing.currency
                  )}
                </span>
              </div>
            </div>
          )}

          <Button
            className='w-full'
            onClick={handleCreateOrder}
            disabled={loading || !delivery}
          >
            {loading ? 'Processing...' : 'Proceed to payment'}
          </Button>
        </div>
      </Main>
    </>
  )
}
