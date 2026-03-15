import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/common'
import { ordersApi } from '@/api/orders'
import { MySalesPage } from '@/features/selling/my-sales-page'

export const Route = createFileRoute('/_authenticated/sales')({
  loader: async () => {
    try {
      const data = await ordersApi.sales({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load sales'),
      }
    }
  },
  component: MySalesPage,
})
