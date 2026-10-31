// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Photo } from '@/types'
import { t } from '@lingui/core/macro'
import { getErrorMessage } from '@mochi/web'
import { listingsApi, type ListingDetailResponse } from '@/api/listings'
import { photosApi } from '@/api/photos'

export interface ListingLoaderData {
  data: ListingDetailResponse | null
  /**
   * The listing's photos, asked for beside the listing since they need only
   * the id in the address; null once that request failed. The page waits on
   * it rather than asking again.
   */
  photos: { listing: string; list: Promise<Photo[] | null> } | null
  error: string | null
}

/**
 * The listing page's loader. Every leg goes to the comptroller, so nothing
 * here waits on another: the photos start with the listing, and the seller's
 * reviews, which need the listing's answer, are left to the page so it draws
 * without them.
 */
export async function loadListing(
  listingId: string
): Promise<ListingLoaderData> {
  const photos = {
    listing: listingId,
    list: photosApi.list(listingId).catch(() => null),
  }
  try {
    const data = await listingsApi.get(listingId)
    return { data, photos, error: null }
  } catch (error) {
    return {
      data: null,
      photos: null,
      error: getErrorMessage(error, t`Failed to load listing`),
    }
  }
}
