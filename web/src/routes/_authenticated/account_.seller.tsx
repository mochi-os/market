import { createFileRoute } from '@tanstack/react-router'
import { SellerSettingsPage } from '@/features/selling/seller-settings-page'
import { useAccountStore } from '@/stores/account-store'

export const Route = createFileRoute('/_authenticated/account_/seller')({
  beforeLoad: async () => {
    const store = useAccountStore.getState()
    if (!store.account) {
      await store.refresh()
    }
  },
  component: SellerSettingsPage,
})
