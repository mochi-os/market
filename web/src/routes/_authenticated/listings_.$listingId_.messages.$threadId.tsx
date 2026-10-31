// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { GeneralError } from '@mochi/web'
import { ListingPage } from '@/features/listing/listing-page'
import { loadListing } from '@/features/listing/load-listing'

export const Route = createFileRoute(
  '/_authenticated/listings_/$listingId_/messages/$threadId'
)({
  loader: ({ params }) => loadListing(params.listingId),
  component: ListingPage,
  errorComponent: GeneralError,
})
