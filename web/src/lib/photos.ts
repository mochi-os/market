import type { Photo } from '@/types'
import { getAppPath } from '@mochi/web'

export function getPhotoUrl(photo: Photo): string {
  return `${getAppPath()}/-/photo/${photo.id}`
}

export function getThumbnailUrl(photo: Photo): string {
  return `${getAppPath()}/-/photo/${photo.id}/thumbnail`
}
