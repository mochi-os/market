// Copyright © 2026 Mochisoft OÜ
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
  const isSeller = useAccountStore((s) => s.isSeller)
  const isLoggedIn = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    // Only load the market account for an authenticated user: accounts/get
    // requires a token, so an anonymous call would 401 and leave the store in
    // an error state. loadSaved is local-only, run always.
    if (isLoggedIn) {
      const { account, isLoading } = useAccountStore.getState()
      if (!account && !isLoading) {
        void useAccountStore.getState().refresh()
      }
    }
    loadSaved()
  }, [isLoggedIn])

  const sidebarData = useSidebarData({ isSeller })

  return (
    <AuthenticatedLayout sidebarData={sidebarData}>
      <Outlet />
    </AuthenticatedLayout>
  )
}
