// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useFormat } from '@mochi/web'
import { serverNow } from '@/lib/clock'

function formatCountdown(
  seconds: number,
  formatNumber: (value: number) => string
): string {
  const days = Math.floor(seconds / 86400)
  const d = formatNumber(days)
  const h = formatNumber(Math.floor((seconds % 86400) / 3600))
  const m = formatNumber(Math.floor((seconds % 3600) / 60))
  const s = formatNumber(seconds % 60)
  if (days > 0) return t`${d}d ${h}h ${m}m`
  if (seconds >= 3600) return t`${h}h ${m}m ${s}s`
  return t`${m}m ${s}s`
}

// The time left until target on the server's clock, ticking each second; once
// it runs out, onExpire runs once.
export function Countdown({
  target,
  skew = 0,
  onExpire,
}: {
  target: number
  skew?: number
  onExpire?: () => void
}) {
  const { formatNumber } = useFormat()
  const [remaining, setRemaining] = useState(() => target - serverNow(skew))
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    setRemaining(target - serverNow(skew))
  }, [target, skew])

  useEffect(() => {
    const id = setInterval(() => {
      const next = target - serverNow(skew)
      setRemaining(next)
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true
        onExpire?.()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [target, skew, onExpire])

  if (remaining <= 0) return <Trans>Ended</Trans>
  return <>{formatCountdown(remaining, formatNumber)}</>
}
