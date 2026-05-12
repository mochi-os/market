import { createFileRoute } from '@tanstack/react-router'
import { SavedPage } from '@/features/buying/saved-page'

export const Route = createFileRoute('/_authenticated/saved')({
  component: SavedPage,
})
