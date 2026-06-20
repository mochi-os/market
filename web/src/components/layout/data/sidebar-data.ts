// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
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
  const pathname = useLocation({ select: (location) => location.pathname })
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    setSavedCount(getSaved().length)
    return onSavedChange(() => setSavedCount(getSaved().length))
  }, [])

  const settingsItems: SidebarData['navGroups'][number]['items'] = [
    {
      title: t`Account`,
      url: APP_ROUTES.ACCOUNT,
      icon: Settings,
      isActive: pathname === APP_ROUTES.ACCOUNT,
    },
    ...(!opts.isSeller
      ? [{
          title: t`Become a seller`,
          url: APP_ROUTES.SELLER_SETTINGS,
          icon: Store,
          isActive: pathname === APP_ROUTES.SELLER_SETTINGS,
        }]
      : [
          {
            title: t`Seller settings`,
            url: APP_ROUTES.SELLER_SETTINGS,
            icon: Store,
            isActive: pathname === APP_ROUTES.SELLER_SETTINGS,
          },
        ]),
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
