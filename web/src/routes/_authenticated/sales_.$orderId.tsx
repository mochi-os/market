import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { ordersApi } from '@/api/orders'
import { SaleDetailPage } from '@/features/selling/sale-detail-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/sales_/$orderId')({
  loader: async ({ params }) => {
    try {
      const data = await ordersApi.get(Number(params.orderId))
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load sale`),
      }
    }
  },
  component: SaleDetailPage,
  errorComponent: GeneralError,
})
