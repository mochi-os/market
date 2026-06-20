// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { AuthenticatedLayout, useAuthStore } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { loadSaved } from '@/lib/saved'
import { useSidebarData } from './data/sidebar-data'

export function MarketLayout() {
  const { isSeller, refresh } = useAccountStore()
  const isLoggedIn = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    // Only load the market account for an authenticated user. accounts/get is a
    // public action, so an anonymous call is run by the core as the host owner
    // and returns the OWNER's account — which would make every listing look
    // owner-owned and hide the buy CTA. loadSaved is local-only, run always.
    if (isLoggedIn) void refresh()
    loadSaved()
  }, [isLoggedIn, refresh])

  const sidebarData = useSidebarData({ isSeller })

  return (
    <AuthenticatedLayout sidebarData={sidebarData}>
      <Outlet />
    </AuthenticatedLayout>
  )
}
