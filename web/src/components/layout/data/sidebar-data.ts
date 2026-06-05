import { useEffect, useState } from 'react'
import {
  Bookmark,
  Gavel,
  Home,
  Inbox,
  List,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Users,
} from 'lucide-react'
import type { SidebarData } from '@mochi/web'
import { useLingui } from '@lingui/react/macro'
import { APP_ROUTES } from '@/config/routes'
import { getSaved, onSavedChange } from '@/lib/saved'

export function useSidebarData(opts: { isSeller: boolean }): SidebarData {
  const { t } = useLingui()
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    setSavedCount(getSaved().length)
    return onSavedChange(() => setSavedCount(getSaved().length))
  }, [])

  const settingsItems = [
    { title: t`Account`, url: APP_ROUTES.ACCOUNT, icon: Settings },
    ...(!opts.isSeller
      ? [{ title: t`Become a seller`, url: APP_ROUTES.ACCOUNT, icon: Store }]
      : []),
  ]

  const navGroups: SidebarData['navGroups'] = [
    {
      title: t`Browse`,
      items: [{ title: t`Home`, url: APP_ROUTES.HOME, icon: Home }],
    },
    {
      title: t`Buying`,
      items: [
        {
          title: t`Saved`,
          url: APP_ROUTES.SAVED,
          icon: Bookmark,
          badge: savedCount > 0 ? String(savedCount) : undefined,
        },
        { title: t`Purchases`, url: APP_ROUTES.PURCHASES, icon: ShoppingCart },
        { title: t`Bids`, url: APP_ROUTES.BIDS, icon: Gavel },
        { title: t`Subscriptions`, url: APP_ROUTES.SUBSCRIPTIONS, icon: Package },
      ],
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
      items: settingsItems,
    },
  ]

  if (opts.isSeller) {
    navGroups.splice(2, 0, {
      title: t`Selling`,
      items: [
        { title: t`Listings`, url: APP_ROUTES.LISTINGS.MINE, icon: List },
        { title: t`Sales`, url: APP_ROUTES.SALES, icon: ShoppingBag },
        { title: t`Subscribers`, url: APP_ROUTES.SUBSCRIBERS, icon: Users },
      ],
    })
  }

  return { navGroups }
}
