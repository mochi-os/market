import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getErrorMessage } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { categoriesApi } from '@/api/listings'
import { HomePage } from '@/features/browse/home-page'

const searchSchema = z.object({
  query: z.string().optional(),
  category: z.coerce.number().optional(),
  type: z.string().optional(),
  condition: z.string().optional(),
  pricing: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  delivery: z.string().optional(),
  location: z.string().optional(),
  sort: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    try {
      const [results, categories] = await Promise.all([
        listingsApi.search({
          sort: 'recent',
          ...deps,
          limit: 24,
        }),
        categoriesApi.list(),
      ])
      return { results, categories, error: null }
    } catch (error) {
      return {
        results: null,
        categories: null,
        error: getErrorMessage(error, 'Failed to load'),
      }
    }
  },
  component: HomePage,
})
