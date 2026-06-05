import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAccountStore } from '@/stores/account-store'
import { APP_ROUTES } from '@/config/routes'
import { BecomeSellerPage } from '@/features/selling/become-seller-page'

export const Route = createFileRoute('/_authenticated/become-seller')({
  beforeLoad: async () => {
    const store = useAccountStore.getState()
    if (!store.account) {
      await store.refresh()
    }
    if (useAccountStore.getState().isSeller) {
      throw redirect({ to: APP_ROUTES.SELLER_SETTINGS })
    }
  },
  component: BecomeSellerPage,
})
