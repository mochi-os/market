import {
  Gavel,
  Home,
  Inbox,
  List,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Users,
} from 'lucide-react'
import type { SidebarData } from '@mochi/web'
import { APP_ROUTES } from '@/config/routes'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Browse',
      items: [{ title: 'Home', url: APP_ROUTES.HOME, icon: Home }],
    },
    {
      title: 'Buying',
      items: [
        { title: 'Purchases', url: APP_ROUTES.PURCHASES, icon: ShoppingCart },
        { title: 'Bids', url: APP_ROUTES.BIDS, icon: Gavel },
        { title: 'Subscriptions', url: APP_ROUTES.SUBSCRIPTIONS, icon: Package },
      ],
    },
    {
      title: 'Selling',
      items: [
        { title: 'Listings', url: APP_ROUTES.LISTINGS.MINE, icon: List },
        { title: 'Sales', url: APP_ROUTES.SALES, icon: ShoppingBag },
        { title: 'Subscribers', url: APP_ROUTES.SUBSCRIBERS, icon: Users },
      ],
    },
    {
      title: 'Messages',
      items: [
        { title: 'Inbox', url: APP_ROUTES.MESSAGES, icon: Inbox },
        { title: 'Reviews', url: APP_ROUTES.REVIEWS, icon: Star },
      ],
    },
    {
      title: 'Settings',
      items: [{ title: 'Account', url: APP_ROUTES.ACCOUNT, icon: Settings }],
    },
  ],
}
