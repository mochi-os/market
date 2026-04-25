import { Home } from 'lucide-react'
import type { SidebarData } from '@mochi/web'
import { APP_ROUTES } from '@/config/routes'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Browse',
      items: [{ title: 'Home', url: APP_ROUTES.HOME, icon: Home }],
    },
  ],
}
