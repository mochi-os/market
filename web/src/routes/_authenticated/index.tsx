// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getErrorMessage, Main } from '@mochi/web'
import { listingsApi, categoriesApi } from '@/api/listings'
import { HomePage } from '@/features/browse/home-page'
import { ListingGridSkeleton } from '@/components/shared/listing-card'
import { t } from '@lingui/core/macro'

const searchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  condition: z.string().optional(),
  pricing: z.string().optional(),
  currency: z.string().optional(),
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
  pendingComponent: () => (
    <Main>
      <ListingGridSkeleton count={8} />
    </Main>
  ),
  component: HomePage,
})
