// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage, GeneralError } from '@mochi/web'
import { ordersApi } from '@/api/orders'
import { OrderDetailPage } from '@/features/buying/order-detail-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/purchases_/$orderId')({
  loader: async ({ params }) => {
    try {
      const data = await ordersApi.get(params.orderId)
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load order`),
      }
    }
  },
  component: OrderDetailPage,
  errorComponent: GeneralError,
})
