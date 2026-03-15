import { createFileRoute } from '@tanstack/react-router'
import { CreateListingPage } from '@/features/selling/create-listing-page'

export const Route = createFileRoute('/_authenticated/listings/create')({
  component: CreateListingPage,
})
