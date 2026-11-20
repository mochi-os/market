// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ShippingOption } from '@/types'

// checkoutTotal(item, delivery, options, option) -> {postage, total}: What the
// buyer is charged, as the Comptroller charges it: postage only for delivery by
// shipping, from the option chosen.
export function checkoutTotal<T extends Pick<ShippingOption, 'id' | 'price'>>(
  item: number,
  delivery: string,
  options: T[],
  option: string
): { postage: T | undefined; total: number } {
  const postage =
    delivery === 'shipping'
      ? options.find((candidate) => String(candidate.id) === option)
      : undefined
  return { postage, total: item + (postage?.price ?? 0) }
}
