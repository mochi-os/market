import { redirect } from '@tanstack/react-router'
import { useAccountStore } from '@/stores/account-store'
import { APP_ROUTES } from '@/config/routes'

export async function requireSeller() {
  const store = useAccountStore.getState()
  if (!store.account && !store.isLoading) {
    await store.refresh()
  }
  if (!useAccountStore.getState().isSeller) {
    throw redirect({
      to: APP_ROUTES.ACCOUNT,
      hash: APP_ROUTES.SELLER_ONBOARDING_HASH,
    })
  }
}
