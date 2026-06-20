// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { Photo } from '@/types'
import { getAppPath } from '@mochi/web'

export function getPhotoUrl(photo: Photo): string {
  return `${getAppPath()}/-/photo/${photo.id}`
}

export function getThumbnailUrl(photo: Photo): string {
  return `${getAppPath()}/-/photo/${photo.id}/thumbnail`
}
