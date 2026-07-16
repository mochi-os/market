// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { GeneralError } from '@mochi/web'
import { ReviewsPage } from '@/features/account/reviews-page'

type TabId = 'received' | 'sent'

type ReviewsSearch = {
  tab?: TabId
}

export const Route = createFileRoute('/_authenticated/reviews')({
  validateSearch: (search: Record<string, unknown>): ReviewsSearch => ({
    tab:
      search.tab === 'received' || search.tab === 'sent' ? search.tab : undefined,
  }),
  component: ReviewsPage,
  errorComponent: GeneralError,
})
