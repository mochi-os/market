import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { categoriesApi } from '@/api/listings'
import { HomePage } from '@/features/browse/home-page'

export const Route = createFileRoute('/_authenticated/')({
  loader: async () => {
    try {
      const [listings, categories] = await Promise.all([
        listingsApi.search({ sort: 'recent', limit: 12 }),
        categoriesApi.list(),
      ])
      return { listings, categories, error: null }
    } catch (error) {
      return {
        listings: null,
        categories: null,
        error: getErrorMessage(error, 'Failed to load'),
      }
    }
  },
  component: HomePage,
})
