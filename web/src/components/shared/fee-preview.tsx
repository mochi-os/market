import type { Fees } from '@/types'
import { useFormatPrice, toMinorUnits } from '@/lib/format'

interface FeePreviewProps {
  fees: Fees | null
  price: string
  currency: string
  pricing: string
}

export function FeePreview({ fees, price, currency, pricing }: FeePreviewProps) {
  const formatPrice = useFormatPrice()
  if (!fees) return null
  if (pricing === 'auction') {
    return (
      <p className='text-xs text-muted-foreground'>
        Mochi takes {fees.platform}% of the final winning bid. Stripe processing
        fees come out of the remainder.
      </p>
    )
  }

  const numeric = Number(price)
  if (!price || !Number.isFinite(numeric) || numeric <= 0) {
    return (
      <p className='text-xs text-muted-foreground'>
        Mochi takes {fees.platform}% of each sale. Stripe processing fees come
        out of the remainder.
      </p>
    )
  }

  const total = toMinorUnits(price, currency)
  const fee = Math.floor((total * fees.platform) / 100)
  const payout = total - fee
  const minor = pricing === 'pwyw' ? ' (minimum)' : pricing === 'subscription' ? ' per period' : ''

  return (
    <p className='text-xs text-muted-foreground'>
      Mochi fee ({fees.platform}%): <span className='font-medium text-foreground'>{formatPrice(fee, currency)}</span>{' '}
      → estimated payout{minor}: <span className='font-medium text-foreground'>~{formatPrice(payout, currency)}</span>{' '}
      before Stripe processing fees.
    </p>
  )
}
