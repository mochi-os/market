import type { Listing } from '@/types'

const KEY = 'market:saved'
const MAX = 200
const EVENT = 'market:saved:changed'

export function getSaved(): Listing[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Listing[]) : []
  } catch {
    return []
  }
}

export function getSavedIds(): Set<number> {
  return new Set(getSaved().map((l) => l.id))
}

export function isSaved(id: number): boolean {
  return getSaved().some((l) => l.id === id)
}

function emit(): void {
  window.dispatchEvent(new Event(EVENT))
}

export function addSaved(listing: Listing): void {
  const current = getSaved().filter((l) => l.id !== listing.id)
  localStorage.setItem(
    KEY,
    JSON.stringify([listing, ...current].slice(0, MAX)),
  )
  emit()
}

export function removeSaved(id: number): void {
  const next = getSaved().filter((l) => l.id !== id)
  localStorage.setItem(KEY, JSON.stringify(next))
  emit()
}

export function toggleSaved(listing: Listing): boolean {
  if (isSaved(listing.id)) {
    removeSaved(listing.id)
    return false
  }
  addSaved(listing)
  return true
}

export function clearSaved(): void {
  localStorage.removeItem(KEY)
  emit()
}

export function onSavedChange(cb: () => void): () => void {
  const handler = () => cb()
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
