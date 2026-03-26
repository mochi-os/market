import type { Photo } from '@/types'
import { MARKET_SERVER_URL } from '@/config/constants'

export function getPhotoUrl(photo: Photo): string {
  return `${MARKET_SERVER_URL}${photo.url}`
}

export function getThumbnailUrl(photo: Photo): string {
  return `${MARKET_SERVER_URL}${photo.thumbnail_url ?? photo.url}`
}
