import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getErrorMessage } from '@mochi/web'
import { listingsApi, categoriesApi } from '@/api/listings'
import { HomePage } from '@/features/browse/home-page'
import { t } from '@lingui/core/macro'

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
    const [resultsR, categoriesR] = await Promise.allSettled([
      listingsApi.search({
        sort: 'recent',
        ...deps,
        limit: 24,
      }),
      categoriesApi.list(),
    ])
    if (resultsR.status === 'rejected') {
      return {
        results: null,
        categories: null,
        error: getErrorMessage(resultsR.reason, t`Failed to load`),
      }
    }
    return {
      results: resultsR.value,
      categories: categoriesR.status === 'fulfilled' ? categoriesR.value : null,
      error: null,
    }
  },
  component: HomePage,
})
