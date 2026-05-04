import type { Listing } from '@/types'
import { Trans } from '@lingui/react/macro'
import { useFormatPrice } from '@/lib/format'

interface PriceDisplayProps {
  listing: Pick<Listing, 'price' | 'currency' | 'pricing' | 'interval'>
}

export function PriceDisplay({ listing }: PriceDisplayProps) {
  const formatPrice = useFormatPrice()
  if (listing.pricing === 'auction') {
    return <span className='text-sm font-semibold'><Trans>Auction</Trans></span>
  }

  const price = formatPrice(listing.price, listing.currency)

  if (listing.pricing === 'pwyw') {
    return <span><Trans>From {price}</Trans></span>
  }

  if (listing.pricing === 'subscription') {
    return (
      <span>
        {price}
        {listing.interval === 'yearly'
          ? <Trans> per year</Trans>
          : <Trans> per month</Trans>}
      </span>
    )
  }

  return <span>{price}</span>
}
