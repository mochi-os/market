import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { AccountPage } from '@/features/account/account-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/account')({
  loader: async () => {
    try {
      const account = await accountsApi.get()
      return { account, error: null }
    } catch (error) {
      return {
        account: null,
        error: getErrorMessage(error, t`Failed to load account`),
      }
    }
  },
  component: AccountPage,
})
