import type { Listing } from '@/types'
import { useFormatPrice } from '@/lib/format'

interface PriceDisplayProps {
  listing: Pick<Listing, 'price' | 'currency' | 'pricing' | 'interval'>
}

export function PriceDisplay({ listing }: PriceDisplayProps) {
  const formatPrice = useFormatPrice()
  if (listing.pricing === 'auction') {
    return <span className='text-sm font-semibold'>Auction</span>
  }

  const price = formatPrice(listing.price, listing.currency)

  if (listing.pricing === 'pwyw') {
    return <span className='text-sm font-semibold'>From {price}</span>
  }

  if (listing.pricing === 'subscription') {
    const interval = listing.interval === 'yearly' ? '/yr' : '/mo'
    return (
      <span className='text-sm font-semibold'>
        {price}
        {interval}
      </span>
    )
  }

  return <span className='text-sm font-semibold'>{price}</span>
}
