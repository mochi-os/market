import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/common'
import { ordersApi } from '@/api/orders'
import { MyPurchasesPage } from '@/features/buying/my-purchases-page'

export const Route = createFileRoute('/_authenticated/purchases')({
  loader: async () => {
    try {
      const data = await ordersApi.purchases({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load purchases'),
      }
    }
  },
  component: MyPurchasesPage,
})
