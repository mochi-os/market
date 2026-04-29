import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { reviewsApi } from '@/api/reviews'
import { ProfilePage } from '@/features/account/profile-page'

export const Route = createFileRoute('/_authenticated/account_/$accountId')({
  loader: async ({ params }) => {
    const [accountR, reviewsR] = await Promise.allSettled([
      accountsApi.get(params.accountId),
      reviewsApi.account({ id: params.accountId }),
    ])
    if (accountR.status === 'rejected') {
      return {
        account: null,
        reviews: null,
        error: getErrorMessage(accountR.reason, 'Failed to load profile'),
      }
    }
    return {
      account: accountR.value,
      reviews: reviewsR.status === 'fulfilled' ? reviewsR.value : null,
      error: null,
    }
  },
  component: ProfilePage,
  errorComponent: GeneralError,
})
