// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useEffect, useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
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
    stripe_code?: string
    stripe_state?: string
  }
  // A handed-back ceremony is completed once: the code is single-use, and a
  // second effect run would report the spent code as a failure.
  const completing = useRef(false)

  useEffect(() => {
    if (oauthReturn.stripe_code && oauthReturn.stripe_state) {
      // Stripe returns every seller to mochi-os.org, which hands the ceremony
      // back to the page it started on, on whichever server that is. It is
      // finished here, signed in, so the Comptroller can check the account
      // finishing is the one that started.
      if (completing.current) return
      completing.current = true
      const code = oauthReturn.stripe_code
      const state = oauthReturn.stripe_state
      window.history.replaceState(null, '', window.location.pathname)
      accountsApi
        .stripeComplete(code, state)
        .then((result) => {
          if (result.connected === '1') {
            toast.success(t`Stripe connected`)
          } else if (result.connected === 'pending') {
            toast.info(
              t`Stripe linked, but Stripe needs more information before you can accept payments`
            )
          } else {
            toast.error(
              t`Stripe connection failed — please try again or contact support`
            )
          }
          refreshAccount({ force: true })
        })
        .catch(() => {
          toast.error(
            t`Stripe connection failed — please try again or contact support`
          )
        })
    } else if (oauthReturn.stripe_connected === '1') {
      toast.success(t`Stripe connected`)
      refreshAccount({ force: true })
      window.history.replaceState(null, '', window.location.pathname)
    } else if (oauthReturn.stripe_connected === 'pending') {
      toast.info(
        t`Stripe linked, but Stripe needs more information before you can accept payments`
      )
      refreshAccount({ force: true })
      window.history.replaceState(null, '', window.location.pathname)
    } else if (oauthReturn.stripe_error) {
      // The query parameter is attacker-craftable (anyone can share a link
      // with ?stripe_error=<text>), so never render it verbatim as an
      // official-looking toast. Every server-minted cause has the same user
      // action (connect again), so one translated message covers them all.
      toast.error(
        t`Stripe connection failed — please try again or contact support`
      )
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [
    oauthReturn.stripe_code,
    oauthReturn.stripe_state,
    oauthReturn.stripe_connected,
    oauthReturn.stripe_error,
    refreshAccount,
    t,
  ])

  async function connect() {
    setConnecting(true)
    try {
      const { redirect } = await accountsApi.stripeOnboarding(
        window.location.href
      )
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
