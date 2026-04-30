import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { ListingPage } from '@/features/listing/listing-page'

export const Route = createFileRoute(
  '/_authenticated/listings_/$listingId_/messages/$threadId'
)({
  loader: async ({ params }) => {
    try {
      const data = await listingsApi.get(Number(params.listingId))
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, "Failed to load listing"),
      }
    }
  },
  component: ListingPage,
  errorComponent: GeneralError,
})
