import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { bidsApi } from '@/api/auctions'
import { ordersApi } from '@/api/orders'
import { MyPurchasesPage } from '@/features/buying/my-purchases-page'

export const Route = createFileRoute('/_authenticated/purchases')({
  loader: async () => {
    try {
      const [data, wonBids] = await Promise.all([
        ordersApi.purchases({}),
        bidsApi.mine({ status: 'won' }),
      ])
      return { data, wonBids: wonBids.bids, error: null }
    } catch (error) {
      return {
        data: null,
        wonBids: [],
        error: getErrorMessage(error, 'Failed to load purchases'),
      }
    }
  },
  component: MyPurchasesPage,
})
