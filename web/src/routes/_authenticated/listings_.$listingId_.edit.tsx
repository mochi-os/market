import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { photosApi } from '@/api/photos'
import { EditListingPage } from '@/features/selling/edit-listing-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute(
  '/_authenticated/listings_/$listingId_/edit'
)({
  loader: async ({ params }) => {
    const id = Number(params.listingId)
    try {
      const [detail, photos] = await Promise.all([
        listingsApi.get(id),
        photosApi.list(id),
      ])
      return { detail, photos, error: null }
    } catch (error) {
      return {
        detail: null,
        photos: null,
        error: getErrorMessage(error, t`Failed to load listing`),
      }
    }
  },
  component: EditListingPage,
  errorComponent: GeneralError,
})
