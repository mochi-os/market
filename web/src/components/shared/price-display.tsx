import type { Listing } from '@/types'
import { useFormatPrice } from '@/lib/format'

interface PriceDisplayProps {
  listing: Pick<Listing, 'price' | 'currency' | 'pricing' | 'interval'>
}

export function PriceDisplay({ listing }: PriceDisplayProps) {
  const formatPrice = useFormatPrice()
  if (listing.pricing === 'auction') {
    return <span>Auction</span>
  }

  const price = formatPrice(listing.price, listing.currency)

  if (listing.pricing === 'pwyw') {
    return <span>From {price}</span>
  }

  if (listing.pricing === 'subscription') {
    const interval =
      listing.interval === 'yearly' ? ' per year' : ' per month'
    return (
      <span>
        {price}
        {interval}
      </span>
    )
  }

  return <span>{price}</span>
}
