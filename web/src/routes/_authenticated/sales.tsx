// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { ordersApi } from '@/api/orders'
import { MySalesPage } from '@/features/selling/my-sales-page'
import { requireSeller } from '@/lib/require-seller'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/sales')({
  beforeLoad: () => requireSeller(),
  loader: async () => {
    try {
      const data = await ordersApi.sales({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load sales`),
      }
    }
  },
  component: MySalesPage,
})
