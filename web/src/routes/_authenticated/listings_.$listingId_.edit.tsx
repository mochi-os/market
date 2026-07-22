// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { photosApi } from '@/api/photos'
import { EditListingPage } from '@/features/selling/edit-listing-page'
import { requireSeller } from '@/lib/require-seller'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute(
  '/_authenticated/listings_/$listingId_/edit'
)({
  beforeLoad: () => requireSeller(),
  loader: async ({ params }) => {
    const id = params.listingId
    try {
      const [detail, photos] = await Promise.all([
        listingsApi.get(id),
        photosApi.ownedList(id),
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
