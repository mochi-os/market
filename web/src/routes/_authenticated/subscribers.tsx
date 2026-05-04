import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { subscriptionsApi } from '@/api/subscriptions'
import { MySubscribersPage } from '@/features/selling/my-subscribers-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/subscribers')({
  loader: async () => {
    try {
      const data = await subscriptionsApi.subscribers({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load subscribers`),
      }
    }
  },
  component: MySubscribersPage,
})
