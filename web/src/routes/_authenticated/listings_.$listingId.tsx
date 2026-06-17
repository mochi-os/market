import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { reviewsApi } from '@/api/reviews'
import { ListingPage } from '@/features/listing/listing-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/listings_/$listingId')({
  loader: async ({ params }) => {
    try {
      const data = await listingsApi.get(params.listingId)
      // Seller reputation reviews — supplementary, so a failure here must not
      // break the listing. The seller id is only known once the listing has
      // loaded, hence the sequential fetch.
      let reviews = null
      if (data.seller?.id) {
        try {
          reviews = await reviewsApi.account({
            id: data.seller.id,
            role: 'buyer',
            limit: 5,
          })
        } catch {
          reviews = null
        }
      }
      return { data, reviews, error: null }
    } catch (error) {
      return {
        data: null,
        reviews: null,
        error: getErrorMessage(error, t`Failed to load listing`),
      }
    }
  },
  component: ListingPage,
  errorComponent: GeneralError,
})
