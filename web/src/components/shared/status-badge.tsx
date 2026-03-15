import { Badge } from '@mochi/common'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sold: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  expired:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  removed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  shipped:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered:
    'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  completed:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  cancelled:
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  scheduled:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ended_sold:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ended_unsold:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  outbid:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paused:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

function formatLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant='outline' className={statusColors[status] ?? ''}>
      {formatLabel(status)}
    </Badge>
  )
}
