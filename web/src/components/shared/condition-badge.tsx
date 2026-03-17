import { Badge } from '@mochi/web'
import type { Condition } from '@/types'

const conditionStyles: Record<Condition, string> = {
  new: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  used: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  refurbished:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
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
