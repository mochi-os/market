import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { ListingPage } from '@/features/listing/listing-page'

export const Route = createFileRoute('/_authenticated/listings/$listingId')({
  validateSearch: (search: Record<string, unknown>) => ({
    messages: search.messages === true || search.messages === 'true' || undefined,
    thread: typeof search.thread === 'string' ? Number(search.thread) : typeof search.thread === 'number' ? search.thread : undefined,
  }),
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
  component: ListingPage,
  errorComponent: GeneralError,
})
