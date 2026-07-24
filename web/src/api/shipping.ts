// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { ShippingOption } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

type ShippingOptionInput = Omit<ShippingOption, 'id' | 'listing'>

export const shippingApi = {
  set: (listing: string, options: ShippingOptionInput[]) =>
    client.post<unknown>(endpoints.shipping.set, {
      listing,
      options: JSON.stringify(options),
    }),
}
