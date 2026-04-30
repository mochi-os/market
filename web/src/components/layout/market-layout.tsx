import { useEffect, useMemo } from 'react'
import { Outlet } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { buildSidebarData } from './data/sidebar-data'

export function MarketLayout() {
  const { isSeller, refresh } = useAccountStore()

  useEffect(() => {
    refresh()
  }, [refresh])

  const sidebarData = useMemo(() => buildSidebarData({ isSeller }), [isSeller])

  return (
    <AuthenticatedLayout sidebarData={sidebarData}>
      <div style={{ '--sticky-top': '52px' } as React.CSSProperties}>
        <div className='sticky top-0 z-40 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950 dark:text-amber-100'>
          <p className='font-medium'>This app is in test mode. Do not use it for real sales or purchases.</p>
          <p>Make test purchases with card 4242 4242 4242 4242, with any future expiry and any security code.</p>
        </div>
        <Outlet />
      </div>
    </AuthenticatedLayout>
  )
}
