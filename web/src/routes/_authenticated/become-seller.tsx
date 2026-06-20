// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute, redirect } from '@tanstack/react-router'
import { APP_ROUTES } from '@/config/routes'

export const Route = createFileRoute('/_authenticated/become-seller')({
  beforeLoad: () => {
    throw redirect({ to: APP_ROUTES.SELLER_SETTINGS })
  },
})
