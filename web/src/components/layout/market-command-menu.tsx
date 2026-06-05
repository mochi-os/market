import { CommandMenu } from '@mochi/web'
import { useAccountStore } from '@/stores/account-store'
import { useSidebarData } from './data/sidebar-data'

export function MarketCommandMenu() {
  const { isSeller } = useAccountStore()
  const sidebarData = useSidebarData({ isSeller })
  return <CommandMenu sidebarData={sidebarData} />
}
