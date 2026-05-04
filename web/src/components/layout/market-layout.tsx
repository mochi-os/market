import { useEffect } from 'react'
import { Trans } from '@lingui/react/macro'
import { Outlet } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { useSidebarData } from './data/sidebar-data'

export function MarketLayout() {
  const { isSeller, refresh } = useAccountStore()

  useEffect(() => {
    refresh()
  }, [refresh])

  const sidebarData = useSidebarData({ isSeller })

  return (
    <AuthenticatedLayout sidebarData={sidebarData}>
      <div style={{ '--sticky-top': '52px' } as React.CSSProperties}>
        <div className='sticky top-0 z-40 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950 dark:text-amber-100'>
          
          <p className='font-medium'>
            <Trans>
              This app is in test mode. Do not use it for real sales or purchases.
            </Trans>
          </p>

          <p>
            <Trans>
              Make test purchases with card 4242 4242 4242 4242, with any future expiry and any security code.
            </Trans>
          </p>

        </div>
        <Outlet />
      </div>
    </AuthenticatedLayout>
  )
}