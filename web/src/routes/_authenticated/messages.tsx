// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { getErrorMessage } from '@mochi/web'
import { threadsApi } from '@/api/threads'
import { MessagesPage } from '@/features/messages/messages-page'
import { t } from '@lingui/core/macro'

export const Route = createFileRoute('/_authenticated/messages')({
  loader: async () => {
    try {
      const data = await threadsApi.mine({})
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error, t`Failed to load messages`),
      }
    }
  },
  component: MessagesPage,
})
