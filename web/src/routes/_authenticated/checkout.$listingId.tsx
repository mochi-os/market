import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { APP_ROUTES } from '@/config/routes'
import { CheckoutPage } from '@/features/buying/checkout-page'

export const Route = createFileRoute('/_authenticated/checkout/$listingId')({
  loader: async ({ params }) => {
    try {
      const data = await listingsApi.get(Number(params.listingId))
      // Only redirect to existing order if it's still incomplete (pending payment).
      // Completed/paid/shipped orders should let the buyer start a fresh purchase.
      if (data.my_order && data.my_order.status === 'pending') {
        throw redirect({ to: APP_ROUTES.PURCHASE(data.my_order.id) })
      }
      return { data, error: null }
    } catch (error) {
      if (isRedirect(error)) throw error
      return {
        data: null,
        error: getErrorMessage(error, "Failed to load listing"),
      }
    }
  },
  component: CheckoutPage,
  errorComponent: GeneralError,
})
