import { createFileRoute, redirect } from '@tanstack/react-router'
import { APP_ROUTES } from '@/config/routes'

export const Route = createFileRoute('/_authenticated/become-seller')({
  beforeLoad: () => {
    throw redirect({ to: APP_ROUTES.SELLER_SETTINGS })
  },
})
