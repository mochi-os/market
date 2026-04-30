import { Badge } from '@mochi/web'
import type { Condition } from '@/types'

const conditionStyles: Record<Condition, string> = {
  new: 'border-transparent bg-green-600 text-white shadow-sm dark:bg-green-500',
  used: 'border-transparent bg-amber-600 text-white shadow-sm dark:bg-amber-500',
  refurbished:
    'border-transparent bg-primary text-primary-foreground shadow-sm',
}

const conditionLabels: Record<Condition, string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <Badge variant='outline' className={conditionStyles[condition]}>
      {conditionLabels[condition]}
    </Badge>
  )
}
