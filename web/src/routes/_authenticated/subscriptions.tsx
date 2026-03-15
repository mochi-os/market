import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/common'
import { subscriptionsApi } from '@/api/subscriptions'
import { MySubscriptionsPage } from '@/features/buying/my-subscriptions-page'

export const Route = createFileRoute('/_authenticated/subscriptions')({
  loader: async () => {
    try {
      const data = await subscriptionsApi.mine({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load subscriptions'),
      }
    }
  },
  component: MySubscriptionsPage,
})
