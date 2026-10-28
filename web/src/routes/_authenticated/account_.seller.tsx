// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { useAccountStore } from '@/stores/account-store'
import {
  SellerSettingsPage,
  type SellerTab,
} from '@/features/selling/seller-settings-page'

type SellerSearch = {
  tab?: SellerTab
}

export const Route = createFileRoute('/_authenticated/account_/seller')({
  beforeLoad: async () => {
    const store = useAccountStore.getState()
    if (!store.account) {
      await store.refresh()
    }
  },
  validateSearch: (search: Record<string, unknown>): SellerSearch => ({
    tab:
      search.tab === 'settings' || search.tab === 'publish'
        ? search.tab
        : undefined,
  }),
  component: SellerSettingsRoute,
})

function SellerSettingsRoute() {
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <SellerSettingsPage
      tab={tab}
      onTab={(next) => void navigate({ search: { tab: next }, replace: true })}
    />
  )
}
