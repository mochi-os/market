// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { useSearch } from '@tanstack/react-router'
import { getErrorMessage, shellNavigateTop, toast } from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'

export function useStripeConnect() {
  const { t } = useLingui()
  const { refresh: refreshAccount } = useAccountStore()
  const [connecting, setConnecting] = useState(false)
  const oauthReturn = useSearch({ strict: false }) as {
    stripe_connected?: string
    stripe_error?: string
  }

  useEffect(() => {
    if (oauthReturn.stripe_connected === '1') {
      toast.success(t`Stripe connected`)
      refreshAccount({ force: true })
      window.history.replaceState(null, '', window.location.pathname)
    } else if (oauthReturn.stripe_connected === 'pending') {
      toast.info(t`Stripe linked, but Stripe needs more information before you can accept payments`)
      refreshAccount({ force: true })
      window.history.replaceState(null, '', window.location.pathname)
    } else if (oauthReturn.stripe_error) {
      // The query parameter is attacker-craftable (anyone can share a link
      // with ?stripe_error=<text>), so never render it verbatim as an
      // official-looking toast. Every server-minted cause has the same user
      // action (connect again), so one translated message covers them all.
      toast.error(t`Stripe connection failed — please try again or contact support`)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [oauthReturn.stripe_connected, oauthReturn.stripe_error, refreshAccount, t])

  async function connect() {
    setConnecting(true)
    try {
      const { redirect } = await accountsApi.stripeOnboarding(window.location.href)
      // Only the server-vetted same-origin path. The raw `url` is present
      // without `redirect` exactly when the server's allowlist rejected it,
      // so falling back to it would send the user to the destination the
      // server refused.
      if (!redirect) {
        toast.error(t`Failed to start Stripe connect`)
        setConnecting(false)
        return
      }
      shellNavigateTop(redirect)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to start Stripe connect`))
      setConnecting(false)
    }
  }

  return { connecting, connect }
}
