// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { reviewsApi } from '@/api/reviews'
import { ProfilePage } from '@/features/account/profile-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/account_/$accountId')({
  loader: async ({ params }) => {
    const [accountR, reviewsR] = await Promise.allSettled([
      accountsApi.profile(params.accountId),
      reviewsApi.account({ id: params.accountId }),
    ])
    if (accountR.status === 'rejected') {
      return {
        account: null,
        reviews: null,
        error: getErrorMessage(accountR.reason, t`Failed to load profile`),
      }
    }
    return {
      account: accountR.value,
      reviews: reviewsR.status === 'fulfilled' ? reviewsR.value : null,
      error: null,
    }
  },
  component: ProfilePage,
  errorComponent: GeneralError,
})
