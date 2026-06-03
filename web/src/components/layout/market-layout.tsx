import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { loadSaved } from '@/lib/saved'
import { useSidebarData } from './data/sidebar-data'

export function MarketLayout() {
  const { isSeller, refresh } = useAccountStore()

  useEffect(() => {
    refresh()
    loadSaved()
  }, [refresh])

  const sidebarData = useSidebarData({ isSeller })

  return (
    <AuthenticatedLayout sidebarData={sidebarData}>
      <Outlet />
    </AuthenticatedLayout>
  )
}
