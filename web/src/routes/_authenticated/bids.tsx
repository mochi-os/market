import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { bidsApi } from '@/api/auctions'
import { MyBidsPage } from '@/features/buying/my-bids-page'

export const Route = createFileRoute('/_authenticated/bids')({
  loader: async () => {
    try {
      const data = await bidsApi.mine({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load bids'),
      }
    }
  },
  component: MyBidsPage,
})
