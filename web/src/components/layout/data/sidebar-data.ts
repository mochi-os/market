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
import { useLingui } from '@lingui/react/macro'
import { APP_ROUTES } from '@/config/routes'

export function useSidebarData(opts: { isSeller: boolean }): SidebarData {
  const { t } = useLingui()
  const sellingItems = opts.isSeller
    ? [
        { title: t`Listings`, url: APP_ROUTES.LISTINGS.MINE, icon: List },
        { title: t`Sales`, url: APP_ROUTES.SALES, icon: ShoppingBag },
        { title: t`Subscribers`, url: APP_ROUTES.SUBSCRIBERS, icon: Users },
      ]
    : [{ title: t`Listings`, url: APP_ROUTES.LISTINGS.MINE, icon: List }]

  return {
    navGroups: [
      {
        title: t`Browse`,
        items: [{ title: t`Home`, url: APP_ROUTES.HOME, icon: Home }],
      },
      {
        title: t`Buying`,
        items: [
          { title: t`Purchases`, url: APP_ROUTES.PURCHASES, icon: ShoppingCart },
          { title: t`Bids`, url: APP_ROUTES.BIDS, icon: Gavel },
          { title: t`Subscriptions`, url: APP_ROUTES.SUBSCRIPTIONS, icon: Package },
        ],
      },
      {
        title: t`Selling`,
        items: sellingItems,
      },
      {
        title: t`Messages`,
        items: [
          { title: t`Inbox`, url: APP_ROUTES.MESSAGES, icon: Inbox },
          { title: t`Reviews`, url: APP_ROUTES.REVIEWS, icon: Star },
        ],
      },
      {
        title: t`Settings`,
        items: [{ title: t`Account`, url: APP_ROUTES.ACCOUNT, icon: Settings }],
      },
    ],
  }
}
