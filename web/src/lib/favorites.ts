import type { Listing } from '@/types'

const KEY = 'market:favorites'
const MAX = 200
const EVENT = 'market:favorites:changed'

export function getFavorites(): Listing[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Listing[]) : []
  } catch {
    return []
  }
}

export function getFavoriteIds(): Set<number> {
  return new Set(getFavorites().map((l) => l.id))
}

export function isFavorite(id: number): boolean {
  return getFavorites().some((l) => l.id === id)
}

function emit(): void {
  window.dispatchEvent(new Event(EVENT))
}

export function addFavorite(listing: Listing): void {
  const current = getFavorites().filter((l) => l.id !== listing.id)
  localStorage.setItem(
    KEY,
    JSON.stringify([listing, ...current].slice(0, MAX)),
  )
  emit()
}

export function removeFavorite(id: number): void {
  const next = getFavorites().filter((l) => l.id !== id)
  localStorage.setItem(KEY, JSON.stringify(next))
  emit()
}

export function toggleFavorite(listing: Listing): boolean {
  if (isFavorite(listing.id)) {
    removeFavorite(listing.id)
    return false
  }
  addFavorite(listing)
  return true
}

export function clearFavorites(): void {
  localStorage.removeItem(KEY)
  emit()
}

export function onFavoritesChange(cb: () => void): () => void {
  const handler = () => cb()
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
