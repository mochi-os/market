import { createFileRoute } from '@tanstack/react-router'
import { SellerPage } from '@/features/account/seller-page'

export const Route = createFileRoute('/_authenticated/seller')({
  component: SellerPage,
})
