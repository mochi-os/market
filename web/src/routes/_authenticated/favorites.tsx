import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/features/buying/favorites-page'

export const Route = createFileRoute('/_authenticated/favorites')({
  component: FavoritesPage,
})
