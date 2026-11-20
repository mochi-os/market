// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  byRegionName,
  cheapestCovering,
  coverage,
  coveringOptions,
  GROUPS,
  regionChoices,
  useRegionName,
  type Regions,
} from './shipping'

const regions: Regions = {
  countries: ['DE', 'FR', 'GB', 'JP', 'US'],
  groups: {
    world: [],
    europe: ['DE', 'FR', 'GB'],
    eu: ['DE', 'FR'],
    north_america: ['US'],
  },
}

const option = (id: string, region: string, price: number) => ({
  id,
  region,
  price,
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
)

function regionName() {
  return renderHook(() => useRegionName(), { wrapper }).result.current
}

describe('coverage', () => {
  it('covers a country by its own code, a group it belongs to, and world', () => {
    expect(coverage(regions, 'GB', 'GB')).toBe('yes')
    expect(coverage(regions, 'europe', 'GB')).toBe('yes')
    expect(coverage(regions, 'world', 'JP')).toBe('yes')
  })

  it('does not cover a country outside the region', () => {
    expect(coverage(regions, 'eu', 'GB')).toBe('no')
    expect(coverage(regions, 'US', 'GB')).toBe('no')
  })

  it('cannot judge free text, or a group not yet read', () => {
    expect(coverage(regions, 'Europe', 'GB')).toBe('unknown')
    expect(coverage(regions, 'europe', 'United Kingdom')).toBe('unknown')
    expect(coverage(undefined, 'europe', 'GB')).toBe('unknown')
  })
})

describe('coveringOptions', () => {
  const options = [
    option('a', 'eu', 300),
    option('b', 'world', 900),
    option('c', 'GB', 500),
    option('d', 'Mainland only', 100),
  ]

  it('offers only the options that ship to the country', () => {
    expect(coveringOptions(options, regions, 'GB').map((o) => o.id)).toEqual([
      'b',
      'c',
      'd',
    ])
  })

  it('offers every option before a country is chosen', () => {
    expect(coveringOptions(options, regions, '')).toEqual(options)
  })
})

describe('cheapestCovering', () => {
  it('chooses the cheapest option that ships to the country', () => {
    const options = [
      option('a', 'eu', 300),
      option('b', 'world', 900),
      option('c', 'europe', 500),
      option('d', 'Mainland only', 100),
    ]
    expect(cheapestCovering(options, regions, 'GB')?.id).toBe('c')
    expect(cheapestCovering(options, regions, 'FR')?.id).toBe('a')
  })

  it('chooses nothing when no option certainly ships there', () => {
    expect(
      cheapestCovering([option('a', 'eu', 300)], regions, 'JP')
    ).toBeUndefined()
  })
})

describe('useRegionName', () => {
  it('shows a group by its label', () => {
    const name = regionName()
    expect(name('world')).toBe('Worldwide')
    expect(name('eu')).toBe('European Union')
    expect(name('asia_pacific')).toBe('Asia-Pacific')
  })

  it('labels every group', () => {
    const name = regionName()
    for (const group of GROUPS) expect(name(group)).not.toBe(group)
  })

  it("shows a country by its name in the reader's language", () => {
    const name = regionName()
    expect(name('GB')).toBe('United Kingdom')
    expect(name('DE')).toBe('Germany')
  })

  it('shows free text as it was written', () => {
    expect(regionName()('Mainland only')).toBe('Mainland only')
  })
})

describe('regionChoices', () => {
  it('offers the groups first, then every country by its name', () => {
    const name = regionName()
    const choices = regionChoices(regions, name, true).map((c) => c.value)
    expect(choices.slice(0, GROUPS.length)).toEqual([...GROUPS])
    expect(choices.slice(GROUPS.length)).toEqual(['FR', 'DE', 'JP', 'GB', 'US'])
  })

  it('offers countries alone for an address', () => {
    const name = regionName()
    expect(regionChoices(regions, name, false).map((c) => c.value)).toEqual([
      'FR',
      'DE',
      'JP',
      'GB',
      'US',
    ])
  })
})

describe('byRegionName', () => {
  it('orders options by the names the reader sees, not their codes', () => {
    const name = regionName()
    const options = [option('a', 'US', 1), option('b', 'DE', 1)]
    expect(byRegionName(options, name).map((o) => o.id)).toEqual(['b', 'a'])
  })
})
