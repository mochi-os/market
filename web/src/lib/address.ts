// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export type AddressValues = {
  address_name: string
  address_line1: string
  address_line2: string
  address_city: string
  address_region: string
  address_postcode: string
  address_country: string
}

export const EMPTY_ADDRESS: AddressValues = {
  address_name: '',
  address_line1: '',
  address_line2: '',
  address_city: '',
  address_region: '',
  address_postcode: '',
  address_country: '',
}

export function addressFromAccount(account: {
  address_name?: string
  address_line1?: string
  address_line2?: string
  address_city?: string
  address_region?: string
  address_postcode?: string
  address_country?: string
} | null | undefined): AddressValues {
  return {
    address_name: account?.address_name ?? '',
    address_line1: account?.address_line1 ?? '',
    address_line2: account?.address_line2 ?? '',
    address_city: account?.address_city ?? '',
    address_region: account?.address_region ?? '',
    address_postcode: account?.address_postcode ?? '',
    address_country: account?.address_country ?? '',
  }
}
