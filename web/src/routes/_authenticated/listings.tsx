import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { MyListingsPage } from '@/features/selling/my-listings-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/listings')({
  loader: async () => {
    try {
      const data = await listingsApi.mine({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load listings`),
      }
    }
  },
  component: MyListingsPage,
})
