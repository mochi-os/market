// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { ordersApi } from '@/api/orders'
import { SaleDetailPage } from '@/features/selling/sale-detail-page'
import { requireSeller } from '@/lib/require-seller'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/sales_/$orderId')({
  beforeLoad: () => requireSeller(),
  loader: async ({ params }) => {
    try {
      const data = await ordersApi.get(params.orderId)
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
