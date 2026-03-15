import { PHOTO_BASE_URL } from '@/config/constants'

export function getPhotoUrl(id: number): string {
  return `${PHOTO_BASE_URL}?id=${id}`
}
