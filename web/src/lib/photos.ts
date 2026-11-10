// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Photo } from '@/types'
import { getAppPath } from '@mochi/web'

export function getThumbnailUrl(photo: Photo): string {
  return `${getAppPath()}/-/photo/${photo.id}/thumbnail`
}

// The 640px variant, for card-sized tiles: the 250px thumbnail blurs there, and
// the preview of a PNG photo is a megabyte or more per card.
export function getMediumUrl(photo: Photo): string {
  return `${getAppPath()}/-/photo/${photo.id}/medium`
}

// The 1280px variant, for the listing page's main photo.
export function getPreviewUrl(photo: Photo): string {
  return `${getAppPath()}/-/photo/${photo.id}/preview`
}

/**
 * What the listing page's gallery draws for the photo at `selected`: the main
 * image at preview size, since its box is at most 26rem tall and a camera
 * photo's original is twenty times its preview; the thumbnail shown blurred
 * under it while it loads; and the previews of the previous and next photos,
 * fetched ahead so that switching shows them at once. Nothing asks for an
 * original. Null when the listing has no photos.
 */
export function galleryAddresses(
  photos: Photo[],
  selected: number
): { main: string; underlay: string; ahead: string[] } | null {
  if (photos.length === 0) return null
  const index = photos[selected] ? selected : 0
  const photo = photos[index]
  const ahead: string[] = []
  for (const step of [-1, 1]) {
    const neighbour = (index + step + photos.length) % photos.length
    const address = getPreviewUrl(photos[neighbour])
    if (neighbour !== index && !ahead.includes(address)) ahead.push(address)
  }
  return {
    main: getPreviewUrl(photo),
    underlay: getThumbnailUrl(photo),
    ahead,
  }
}
