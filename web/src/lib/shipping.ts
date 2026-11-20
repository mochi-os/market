// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// A shipping option's region is a code: a country's ISO 3166-1 alpha-2 code in
// upper case ("GB"), or a group's code in lower case ("europe"). A buyer's
// address names its country by the same code. The Comptroller holds which
// countries each group covers and answers it from shipping/regions; anything
// else stored as a region or a country is free text from before codes, shown
// as it is and matched against nothing.
import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ShippingOption } from '@/types'
import { useLingui } from '@lingui/react/macro'
import { naturalCompare } from '@mochi/web'
import { shippingApi } from '@/api/shipping'

export interface Regions {
  countries: string[]
  // Each group's countries; world lists none and covers every country.
  groups: Record<string, string[]>
}

// The groups, in the order the editor offers them.
export const GROUPS = [
  'world',
  'europe',
  'eu',
  'eea',
  'north_america',
  'south_america',
  'latin_america',
  'middle_east',
  'africa',
  'asia',
  'oceania',
  'asia_pacific',
] as const

const GROUP_SET = new Set<string>(GROUPS)

// isCountry(value) -> boolean: Whether a region or address names a country by
// its code.
export function isCountry(value: string): boolean {
  return /^[A-Z]{2}$/.test(value)
}

// isGroup(value) -> boolean: Whether a region names a group by its code.
export function isGroup(value: string): boolean {
  return GROUP_SET.has(value)
}

// coverage(regions, region, country) -> 'yes' | 'no' | 'unknown': Whether an
// option for a region ships to a country. Free text on either side, or a
// group whose countries have not been read, cannot be judged.
export function coverage(
  regions: Regions | undefined,
  region: string,
  country: string
): 'yes' | 'no' | 'unknown' {
  if (!isCountry(country)) return 'unknown'
  if (region === 'world' || region === country) return 'yes'
  if (isCountry(region)) return 'no'
  if (!isGroup(region)) return 'unknown'
  const members = regions?.groups[region]
  if (!members) return 'unknown'
  return members.includes(country) ? 'yes' : 'no'
}

// coveringOptions(options, regions, country) -> options: The options a buyer
// in country may choose: every one with no country chosen, else those that
// ship there and those that cannot be judged.
export function coveringOptions<T extends Pick<ShippingOption, 'region'>>(
  options: T[],
  regions: Regions | undefined,
  country: string
): T[] {
  if (!country.trim()) return options
  return options.filter(
    (option) => coverage(regions, option.region, country) !== 'no'
  )
}

// cheapestCovering(options, regions, country) -> option or undefined: The
// cheapest option that certainly ships to country.
export function cheapestCovering<
  T extends Pick<ShippingOption, 'region' | 'price'>,
>(options: T[], regions: Regions | undefined, country: string): T | undefined {
  let best: T | undefined
  for (const option of options) {
    if (coverage(regions, option.region, country) !== 'yes') continue
    if (!best || option.price < best.price) best = option
  }
  return best
}

// The country and group codes, read once a session: they change only with the
// Comptroller.
export function useRegions() {
  return useQuery({
    queryKey: ['market', 'shipping', 'regions'],
    queryFn: () => shippingApi.regions(),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

function useGroupLabels(): Record<string, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      world: t`Worldwide`,
      europe: t`Europe`,
      eu: t`European Union`,
      eea: t`European Economic Area`,
      north_america: t`North America`,
      south_america: t`South America`,
      latin_america: t`Latin America`,
      middle_east: t`Middle East`,
      africa: t`Africa`,
      asia: t`Asia`,
      oceania: t`Oceania`,
      asia_pacific: t`Asia-Pacific`,
    }),
    [t]
  )
}

// countryNames(locale) -> (code) -> name or undefined: Country names in the
// reader's language, from the browser's own table.
function countryNames(locale: string): (code: string) => string | undefined {
  // Country names: useFormat formats numbers and dates, and has none.
  let names: Intl.DisplayNames | null = null // i18n-format-ok: country names
  try {
    names = new Intl.DisplayNames([locale, 'en'], { type: 'region' }) // i18n-format-ok: country names
  } catch {
    names = null
  }
  return (code) => {
    try {
      const name = names?.of(code)
      return name && name !== code ? name : undefined
    } catch {
      return undefined
    }
  }
}

// useRegionName() -> (region) -> string: How to show a region or an address's
// country: a group by its label, a country by its name in the reader's
// language, and free text as it was written.
export function useRegionName(): (region: string) => string {
  const { i18n } = useLingui()
  const labels = useGroupLabels()
  const names = useMemo(() => countryNames(i18n.locale), [i18n.locale])
  return useCallback(
    (region: string) => {
      if (isGroup(region)) return labels[region]
      if (isCountry(region)) return names(region) ?? region
      return region
    },
    [labels, names]
  )
}

// regionChoices(regions, name, groups) -> [{value, label}]: What a picker
// offers: the groups first when asked for, then every country by its name.
export function regionChoices(
  regions: Regions | undefined,
  name: (region: string) => string,
  groups: boolean
): Array<{ value: string; label: string }> {
  const countries = (regions?.countries ?? [])
    .map((code) => ({ value: code, label: name(code) }))
    .sort((a, b) => naturalCompare(a.label, b.label))
  if (!groups) return countries
  return [
    ...GROUPS.map((code) => ({ value: code, label: name(code) })),
    ...countries,
  ]
}

// byRegionName(options, name) -> options: Shipping options in the order of the
// names the reader sees.
export function byRegionName<T extends Pick<ShippingOption, 'region'>>(
  options: T[],
  name: (region: string) => string
): T[] {
  return [...options].sort((a, b) =>
    naturalCompare(name(a.region), name(b.region))
  )
}
