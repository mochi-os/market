import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { reviewsApi } from '@/api/reviews'
import { ProfilePage } from '@/features/account/profile-page'

export const Route = createFileRoute('/_authenticated/account/$accountId')({
  loader: async ({ params }) => {
    try {
      const [account, reviews] = await Promise.all([
        accountsApi.get(params.accountId),
        reviewsApi.account({ id: params.accountId }),
      ])
      return { account, reviews, error: null }
    } catch (error) {
      return {
        account: null,
        reviews: null,
        error: getErrorMessage(error, 'Failed to load profile'),
      }
    }
  },
  component: ProfilePage,
  errorComponent: GeneralError,
})
