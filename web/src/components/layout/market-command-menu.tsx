// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { CommandMenu } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { useSidebarData } from './data/sidebar-data'

export function MarketCommandMenu() {
  const { isSeller } = useAccountStore()
  const sidebarData = useSidebarData({ isSeller })
  return <CommandMenu sidebarData={sidebarData} />
}
