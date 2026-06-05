import { createFileRoute, redirect } from '@tanstack/react-router'
import { APP_ROUTES } from '@/config/routes'
import { SellerSettingsPage } from '@/features/selling/seller-settings-page'
import { useAccountStore } from '@/stores/account-store'

export const Route = createFileRoute('/_authenticated/account_/seller')({
  beforeLoad: async () => {
    const store = useAccountStore.getState()
    if (!store.account) {
      await store.refresh()
    }
    if (!useAccountStore.getState().isSeller) {
      throw redirect({ to: APP_ROUTES.BECOME_SELLER })
    }
  },
  component: SellerSettingsPage,
})
