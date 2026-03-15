import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/common'
import { listingsApi } from '@/api/listings'
import { CheckoutPage } from '@/features/buying/checkout-page'

export const Route = createFileRoute('/_authenticated/checkout/$listingId')({
  loader: async ({ params }) => {
    try {
      const data = await listingsApi.get(Number(params.listingId))
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load listing'),
      }
    }
  },
  component: CheckoutPage,
  errorComponent: GeneralError,
})
