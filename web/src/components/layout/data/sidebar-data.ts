import { Home, Search } from 'lucide-react'
import type { SidebarData } from '@mochi/common'
import { APP_ROUTES } from '@/config/routes'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Browse',
      items: [
        { title: 'Home', url: APP_ROUTES.HOME, icon: Home },
        { title: 'Search', url: APP_ROUTES.SEARCH, icon: Search },
      ],
    },
  ],
}
