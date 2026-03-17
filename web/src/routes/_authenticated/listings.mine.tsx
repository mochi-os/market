import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { MyListingsPage } from '@/features/selling/my-listings-page'

export const Route = createFileRoute('/_authenticated/listings/mine')({
  loader: async () => {
    try {
      const data = await listingsApi.mine({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, 'Failed to load listings'),
      }
    }
  },
  component: MyListingsPage,
})
