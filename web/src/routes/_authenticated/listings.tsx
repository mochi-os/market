import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { useAccountStore } from '@/stores/account-store'
import { MyListingsPage } from '@/features/selling/my-listings-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/listings')({
  loader: async () => {
    // Refresh the account store before render so isOnboarded reflects the
    // real backend state on first paint. Without this the connect-Stripe
    // form briefly flashes for already-onboarded sellers because the
    // store starts with isOnboarded=false and only updates after the
    // layout's useEffect fires.
    const accountPromise = useAccountStore.getState().refresh()
    try {
      const [data] = await Promise.all([listingsApi.mine({}), accountPromise])
      return { data, error: null }
    } catch (error) {
      await accountPromise.catch(() => {})
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load listings`),
      }
    }
  },
  component: MyListingsPage,
})
