import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@mochi/web'
import { MarketLayout } from '@/components/layout/market-layout'
import { useAccountStore } from '@/stores/account-store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const store = useAuthStore.getState()
    if (!store.isInitialized) {
      await store.initialize()
    }
    await useAccountStore.getState().refresh()
  },
  component: MarketLayout,
})
