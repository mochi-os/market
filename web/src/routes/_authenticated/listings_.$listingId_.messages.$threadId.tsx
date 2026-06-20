// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { ListingPage } from '@/features/listing/listing-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute(
  '/_authenticated/listings_/$listingId_/messages/$threadId'
)({
  loader: async ({ params }) => {
    try {
      const data = await listingsApi.get(params.listingId)
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load listing`),
      }
    }
  },
  component: ListingPage,
  errorComponent: GeneralError,
})
