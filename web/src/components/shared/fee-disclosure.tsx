import type { Fees } from '@/types'

import { Trans } from '@lingui/react/macro'
interface FeeDisclosureProps {
  fees: Fees | null
  subtitle?: string
}

export function FeeDisclosure({ fees, subtitle }: FeeDisclosureProps) {
  if (!fees) {
    return <div><Trans>Loading fee details...</Trans></div>
  }

  return (
    <div className='space-y-1.5'>
      {subtitle && <p className='font-bold'>{subtitle}</p>}
      <p className='font-medium'>Fees:</p>
      <ul className='list-disc space-y-1 ps-4'>
        <li>
          Mochi takes <span className='font-medium'>{fees.platform}%</span>{' '}
          of each sale.
        </li>
        <li>
          Stripe charges its own processing fee per transaction and a flat fee
          per chargeback. Current rates for your currency and region are listed
          in your Stripe Dashboard.
        </li>
      </ul>
    </div>
  )
}
