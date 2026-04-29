import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { bidsApi } from '@/api/auctions'
import { ordersApi } from '@/api/orders'
import { MyPurchasesPage } from '@/features/buying/my-purchases-page'

export const Route = createFileRoute('/_authenticated/purchases')({
  loader: async () => {
    const [dataR, wonBidsR] = await Promise.allSettled([
      ordersApi.purchases({}),
      bidsApi.mine({ status: 'won' }),
    ])
    if (dataR.status === 'rejected') {
      return {
        data: null,
        wonBids: [],
        error: getErrorMessage(dataR.reason, 'Failed to load purchases'),
      }
    }
    return {
      data: dataR.value,
      wonBids: wonBidsR.status === 'fulfilled' ? wonBidsR.value.bids : [],
      error: null,
    }
  },
  component: MyPurchasesPage,
})
