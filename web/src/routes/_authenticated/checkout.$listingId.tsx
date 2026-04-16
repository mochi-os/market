import { createFileRoute, redirect } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { APP_ROUTES } from '@/config/routes'
import { CheckoutPage } from '@/features/buying/checkout-page'

export const Route = createFileRoute('/_authenticated/checkout/$listingId')({
  loader: async ({ params }) => {
    try {
      const data = await listingsApi.get(Number(params.listingId))
      if (data.my_order) {
        throw redirect({ to: APP_ROUTES.PURCHASE(data.my_order.id) })
      }
      return { data, error: null }
    } catch (error) {
      if (error && typeof error === 'object' && 'to' in error) throw error
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load listing'),
      }
    }
  },
  component: CheckoutPage,
  errorComponent: GeneralError,
})
