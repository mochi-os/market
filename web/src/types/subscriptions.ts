// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { Currency, Interval, SubscriptionStatus } from './common'

export interface Subscription {
  id: string
  listing: string
  buyer: string
  seller: string
  stripe: string
  interval: Interval
  amount: number
  currency: Currency
  status: SubscriptionStatus
  starts: number
  ends: number
  created: number
  cancelled: number
  title?: string
  listing_type?: string
  buyer_name?: string
}
