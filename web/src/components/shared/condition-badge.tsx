// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Condition } from '@/types'
import { useLingui } from '@lingui/react/macro'
import { StatusPill, type StatusTone } from '@mochi/web'

// Same tone system the sibling StatusBadge uses, so the two market badges match.
const conditionTones: Record<Condition, StatusTone> = {
  new: 'success',
  used: 'warning',
  refurbished: 'accent',
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  const { t } = useLingui()
  const conditionLabels: Record<Condition, string> = {
    new: t`New`,
    used: t`Used`,
    refurbished: t`Refurbished`,
  }
  return (
    <StatusPill tone={conditionTones[condition]}>
      {conditionLabels[condition]}
    </StatusPill>
  )
}
