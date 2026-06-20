// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { bidsApi } from '@/api/auctions'
import { MyBidsPage } from '@/features/buying/my-bids-page'
import { t } from '@lingui/core/macro'

const STATUSES = ['active', 'outbid', 'won', 'lost'] as const
type Status = (typeof STATUSES)[number]

type BidsSearch = {
  status?: Status
}

export const Route = createFileRoute('/_authenticated/bids')({
  validateSearch: (search: Record<string, unknown>): BidsSearch => ({
    status: STATUSES.includes(search.status as Status) ? (search.status as Status) : undefined,
  }),
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: async ({ deps }) => {
    try {
      const data = await bidsApi.mine(deps.status ? { status: deps.status } : {})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load bids`),
      }
    }
  },
  component: MyBidsPage,
})
