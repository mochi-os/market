// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { getErrorMessage } from '@mochi/web'
import { bidsApi } from '@/api/auctions'
import { ordersApi } from '@/api/orders'
import { everyPage } from '@/lib/paging'
import { MyPurchasesPage } from '@/features/buying/my-purchases-page'

export const Route = createFileRoute('/_authenticated/purchases')({
  loader: async () => {
    const [dataR, wonBidsR] = await Promise.allSettled([
      ordersApi.purchases({}),
      // Every auction won and not yet paid for, however many pages they take.
      everyPage(
        (request) =>
          bidsApi
            .mine({ status: 'won', ...request })
            .then((r) => ({ items: r.bids, total: r.total, next: r.next })),
        (bid) => bid.id
      ),
    ])
    if (dataR.status === 'rejected') {
      return {
        data: null,
        wonBids: [],
        error: getErrorMessage(dataR.reason, t`Failed to load purchases`),
      }
    }
    return {
      data: dataR.value,
      wonBids: wonBidsR.status === 'fulfilled' ? wonBidsR.value : [],
      error: null,
    }
  },
  component: MyPurchasesPage,
})
