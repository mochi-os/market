import { useEffect, useMemo } from 'react'
import { Outlet } from '@tanstack/react-router'
import { AuthenticatedLayout, shellSubscribeNotifications, useAuthStore } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { buildSidebarData } from './data/sidebar-data'

export function MarketLayout() {
  const { isSeller, refresh } = useAccountStore()
  const isLoggedIn = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!isLoggedIn) return
    void shellSubscribeNotifications('market', [
      { label: 'Messages', topic: 'message', defaultEnabled: true },
      { label: 'Order updates (selling)', topic: 'order/seller', defaultEnabled: true },
      { label: 'Order updates (buying)', topic: 'order/buyer', defaultEnabled: true },
      { label: 'Bid received', topic: 'bid/placed', defaultEnabled: true },
      { label: 'Outbid', topic: 'auction/outbid', defaultEnabled: true },
      { label: 'Auction ended', topic: 'auction/ended', defaultEnabled: true },
      { label: 'Auction cancelled', topic: 'auction/cancelled', defaultEnabled: true },
      { label: 'Subscription updates (selling)', topic: 'subscription/seller', defaultEnabled: true },
      { label: 'Subscription updates (buying)', topic: 'subscription/buyer', defaultEnabled: true },
      { label: 'Listing moderation', topic: 'listing/moderation', defaultEnabled: true },
      { label: 'Reviews received', topic: 'review/received', defaultEnabled: true },
      { label: 'Review responses', topic: 'review/responded', defaultEnabled: true },
      { label: 'Report outcomes', topic: 'report/reporter', defaultEnabled: true },
      { label: 'Moderation actions against you', topic: 'report/target', defaultEnabled: true },
      { label: 'Account status', topic: 'account/moderation', defaultEnabled: true },
      { label: 'Stripe Connect status', topic: 'account/stripe', defaultEnabled: true },
    ])
  }, [isLoggedIn])

  const sidebarData = useMemo(() => buildSidebarData({ isSeller }), [isSeller])

  return (
    <AuthenticatedLayout sidebarData={sidebarData}>
      <div style={{ '--sticky-top': '52px' } as React.CSSProperties}>
        <div className='sticky top-0 z-40 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'>
          <p className='font-medium'>This app is in test mode. Do not use it for real sales or purchases.</p>
          <p>Make test purchases with card 4242 4242 4242 4242, with any future expiry and any security code.</p>
        </div>
        <Outlet />
      </div>
    </AuthenticatedLayout>
  )
}
