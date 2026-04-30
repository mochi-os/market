import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { subscriptionsApi } from '@/api/subscriptions'
import { MySubscribersPage } from '@/features/selling/my-subscribers-page'

export const Route = createFileRoute('/_authenticated/subscribers')({
  loader: async () => {
    try {
      const data = await subscriptionsApi.subscribers({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, "Failed to load subscribers"),
      }
    }
  },
  component: MySubscribersPage,
})
