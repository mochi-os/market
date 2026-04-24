import { useEffect, useMemo } from 'react'
import { Outlet } from '@tanstack/react-router'
import {
  Gavel,
  Home,
  Inbox,
  List,
  type LucideIcon,
  Package,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { AuthenticatedLayout, type SidebarData, shellSubscribeNotifications, useAuthStore } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { APP_ROUTES } from '@/config/routes'

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

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

  const sidebarData = useMemo<SidebarData>(() => {
    const browseItems: NavItem[] = [
      { title: 'Home', url: APP_ROUTES.HOME, icon: Home },
      { title: 'Search', url: APP_ROUTES.SEARCH, icon: Search },
    ]

    const buyingItems: NavItem[] = [
      { title: 'Purchases', url: APP_ROUTES.PURCHASES, icon: ShoppingCart },
      { title: 'Bids', url: APP_ROUTES.BIDS, icon: Gavel },
      {
        title: 'Subscriptions',
        url: APP_ROUTES.SUBSCRIPTIONS,
        icon: Package,
      },
    ]

    const sellingItems: NavItem[] = isSeller
      ? [
          { title: 'Listings', url: APP_ROUTES.LISTINGS.MINE, icon: List },
          { title: 'Sales', url: APP_ROUTES.SALES, icon: ShoppingBag },
          { title: 'Subscribers', url: APP_ROUTES.SUBSCRIBERS, icon: Users },
        ]
      : [{ title: 'Listings', url: APP_ROUTES.LISTINGS.MINE, icon: List }]

    const messageItems: NavItem[] = [
      { title: 'Inbox', url: APP_ROUTES.MESSAGES, icon: Inbox },
    ]

    const settingsItems: NavItem[] = [
      { title: 'Account', url: APP_ROUTES.ACCOUNT, icon: Settings },
    ]

    const groups = [
      { title: 'Browse', items: browseItems },
      { title: 'Buying', items: buyingItems },
      { title: 'Selling', items: sellingItems },
      { title: 'Messages', items: messageItems },
      { title: 'Settings', items: settingsItems },
    ]

    return { navGroups: groups }
  }, [isSeller])

  return (
    <AuthenticatedLayout sidebarData={sidebarData}>
      <Outlet />
    </AuthenticatedLayout>
  )
}
