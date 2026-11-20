// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Countdown } from './countdown'

const NOW = 1_800_000_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW * 1000)
})

afterEach(() => {
  vi.useRealTimers()
})

function show(target: number, skew: number, onExpire?: () => void) {
  return render(
    <I18nProvider i18n={i18n}>
      <Countdown target={target} skew={skew} onExpire={onExpire} />
    </I18nProvider>
  )
}

describe('Countdown', () => {
  it("counts down on the server's clock, not this one", () => {
    // The server is a minute ahead: two minutes by this clock is one by its.
    show(NOW + 120, 60)
    expect(screen.getByText('1m 0s')).toBeInTheDocument()
  })

  it('ends when the server says the time is up', () => {
    const expired = vi.fn()
    show(NOW + 30, 60, expired)
    expect(screen.getByText('Ended')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1000))
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('ticks', () => {
    show(NOW + 90, 0)
    expect(screen.getByText('1m 30s')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('1m 29s')).toBeInTheDocument()
  })
})
