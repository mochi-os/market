import type { Fees } from '@/types'
import { useFormatPrice } from '@/lib/format'

interface FeeDisclosureProps {
  fees: Fees | null
}

export function FeeDisclosure({ fees }: FeeDisclosureProps) {
  const formatPrice = useFormatPrice()
  if (!fees) {
    return (
      <div className='text-xs text-muted-foreground'>Loading fee details...</div>
    )
  }

  const chargebackExamples = ['gbp', 'usd', 'eur']
    .map((code) => ({ code, fee: fees.currencies[code] }))
    .filter((x) => x.fee && x.fee.chargeback > 0)
    .map((x) => formatPrice(x.fee!.chargeback, x.code))
    .join(' / ')

  return (
    <div className='space-y-1.5 text-xs text-muted-foreground'>
      <p className='font-medium text-foreground'>Fees</p>
      <ul className='list-disc space-y-1 pl-4'>
        <li>
          Mochi takes <span className='font-medium text-foreground'>{fees.platform}%</span>{' '}
          of each sale.
        </li>
        <li>
          Stripe charges its own per-transaction processing fee. Rates depend on
          currency, region, and card type — see{' '}
          <a
            href='https://stripe.com/pricing'
            target='_blank'
            rel='noopener noreferrer'
            className='underline underline-offset-2 hover:text-foreground'
          >
            stripe.com/pricing
          </a>
          .
        </li>
        {chargebackExamples && (
          <li>
            Each chargeback deducts a flat fee ({chargebackExamples}) from your
            Stripe balance. Refunded if you win the dispute.
          </li>
        )}
      </ul>
    </div>
  )
}
