// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useLingui } from '@lingui/react/macro'
import { Badge } from '@mochi/web'
import type { Condition } from '@/types'

/* eslint-disable lingui/no-unlocalized-strings -- Tailwind utility-class strings */
const conditionStyles: Record<Condition, string> = {
  new: 'border-transparent bg-green-600 text-white shadow-sm dark:bg-green-500',
  used: 'border-transparent bg-amber-600 text-white shadow-sm dark:bg-amber-500',
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
