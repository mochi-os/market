import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/common'
import { ordersApi } from '@/api/orders'
import { OrderDetailPage } from '@/features/buying/order-detail-page'

export const Route = createFileRoute('/_authenticated/purchases/$orderId')({
  loader: async ({ params }) => {
    try {
      const data = await ordersApi.get(Number(params.orderId))
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load order'),
      }
    }
  },
  component: OrderDetailPage,
  errorComponent: GeneralError,
})
