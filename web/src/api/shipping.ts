// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ShippingOption } from '@/types'
import type { Regions } from '@/lib/shipping'
import { client, type keepalive } from './client'
import { endpoints } from './endpoints'

type ShippingOptionInput = Omit<ShippingOption, 'id' | 'listing'>

export const shippingApi = {
  set: (
    listing: string,
    options: ShippingOptionInput[],
    delivery?: typeof keepalive
  ) =>
    client.post<unknown>(
      endpoints.shipping.set,
      { listing, options: JSON.stringify(options) },
      delivery
    ),

  // The country codes, and the countries each group code covers.
  regions: () =>
    client
      .post<{ data: Regions }>(endpoints.shipping.regions, {})
      .then((r) => r.data),
}
