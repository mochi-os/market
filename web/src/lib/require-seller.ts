// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { redirect } from '@tanstack/react-router'
import { APP_ROUTES } from '@/config/routes'
import { useAccountStore } from '@/stores/account-store'

export async function requireSeller() {
  if (!useAccountStore.getState().isSeller) {
    await useAccountStore.getState().refresh()
  }
  if (!useAccountStore.getState().isSeller) {
    throw redirect({ to: APP_ROUTES.SELLER_SETTINGS })
  }
}
