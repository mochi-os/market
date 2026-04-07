import { useEffect, useMemo } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Gavel,
  Home,
  Inbox,
  List,
  type LucideIcon,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react'
import { AuthenticatedLayout, type SidebarData, shellSubscribeNotifications, useAuthStore } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { client } from '@/api/client'
import { endpoints } from '@/api/endpoints'
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

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-check', 'market'],
    queryFn: () => client.get<{ data: { exists: boolean } }>(endpoints.notifications.check),
    staleTime: Infinity,
    enabled: isLoggedIn,
  })

  useEffect(() => {
    if (subscriptionData?.data && !subscriptionData.data.exists) {
      shellSubscribeNotifications('market', [
        { label: 'Messages', type: 'message', defaultEnabled: true },
      ])
    }
  }, [subscriptionData])

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
          { title: 'My listings', url: APP_ROUTES.LISTINGS.MINE, icon: List },
          {
            title: 'Create listing',
            url: APP_ROUTES.LISTINGS.CREATE,
            icon: Plus,
          },
          { title: 'Sales', url: APP_ROUTES.SALES, icon: ShoppingBag },
          { title: 'Subscribers', url: APP_ROUTES.SUBSCRIBERS, icon: Users },
        ]
      : []

    const messageItems: NavItem[] = [
      { title: 'Inbox', url: APP_ROUTES.MESSAGES, icon: Inbox },
    ]

    const settingsItems: NavItem[] = [
      { title: 'Account', url: APP_ROUTES.ACCOUNT, icon: Settings },
    ]

    if (!isSeller) {
      settingsItems.push({
        title: 'Become a seller',
        url: APP_ROUTES.SELLER,
        icon: Store,
      })
    }

    const groups = [
      { title: 'Browse', items: browseItems },
      { title: 'Buying', items: buyingItems },
    ]

    if (sellingItems.length > 0) {
      groups.push({ title: 'Selling', items: sellingItems })
    }

    groups.push({ title: 'Messages', items: messageItems })
    groups.push({ title: 'Settings', items: settingsItems })

    return { navGroups: groups }
  }, [isSeller])

  return (
    <AuthenticatedLayout sidebarData={sidebarData}>
      <Outlet />
    </AuthenticatedLayout>
  )
}
