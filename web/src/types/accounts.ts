// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export interface Account {
  id: string
  name: string
  biography: string
  business: number
  company: string
  vat: string
  address_name: string
  address_line1: string
  address_line2: string
  address_city: string
  address_region: string
  address_postcode: string
  address_country: string
  location: string
  seller: number
  stripe: string
  stripe_testmode: boolean
  onboarded: number
  verified: number
  status: string
  reason: string
  rating: number
  reviews: number
  sales: number
  created: number
  updated: number
}

export interface AccountSummary {
  id: string
  name: string
  location: string
  status?: string
  verified?: number
  onboarded?: number
  rating: number
  reviews: number
  sales: number
  created: number
}

export interface Fees {
  platform: number
}
