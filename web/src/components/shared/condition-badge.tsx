import { useLingui } from '@lingui/react/macro'
import { Badge } from '@mochi/web'
import type { Condition } from '@/types'

/* eslint-disable lingui/no-unlocalized-strings -- Tailwind utility-class strings */
const conditionStyles: Record<Condition, string> = {
  new: 'border-transparent bg-success text-success-foreground shadow-sm',
  used: 'border-transparent bg-warning text-warning-foreground shadow-sm',
  refurbished:
    'border-transparent bg-primary text-primary-foreground shadow-sm',
}
/* eslint-enable lingui/no-unlocalized-strings */

export function ConditionBadge({ condition }: { condition: Condition }) {
  const { t } = useLingui()
  const conditionLabels: Record<Condition, string> = {
    new: t`New`,
    used: t`Used`,
    refurbished: t`Refurbished`,
  }
  return (
    <Badge variant='outline' className={conditionStyles[condition]}>
      {conditionLabels[condition]}
    </Badge>
  )
}
