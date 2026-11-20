// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { beforeEach, describe, expect, it } from 'vitest'
import { nearestDuration, rememberRelist, takeRelist } from './relist'

const offered = ['1', '3', '5', '7', '10', '14']

beforeEach(() => {
  sessionStorage.clear()
})

describe('relist settings', () => {
  it("carry the auction's reserve, buy-now price and anti-sniping setting", () => {
    rememberRelist(
      'l9',
      {
        reserve: 50000,
        instant: 90000,
        opens: 0,
        closes: 5 * 86400,
        extend: 0,
        extension: 10,
      },
      offered
    )
    expect(takeRelist('l9')).toEqual({
      reserve: 50000,
      instant: 90000,
      duration: '5',
      extend: 0,
      extension: 10,
    })
    expect(sessionStorage.getItem('relist:l9')).toBeNull()
  })

  it('give a length the editor offers', () => {
    expect(nearestDuration(4 * 86400 - 60, offered)).toBe('3')
    expect(nearestDuration(6.6 * 86400, offered)).toBe('7')
    expect(nearestDuration(40 * 86400, offered)).toBe('14')
  })
})
