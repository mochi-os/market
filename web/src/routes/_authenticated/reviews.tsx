import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { reviewsApi } from '@/api/reviews'
import { ReviewsPage } from '@/features/account/reviews-page'

export const Route = createFileRoute('/_authenticated/reviews')({
  loader: async () => {
    try {
      const data = await reviewsApi.inbox({ limit: 24 })
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load reviews'),
      }
    }
  },
  component: ReviewsPage,
  errorComponent: GeneralError,
})
