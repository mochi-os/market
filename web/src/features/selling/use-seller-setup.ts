// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { toast, getErrorMessage } from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'
import { useStripeConnect } from './use-stripe-connect'

export function useSellerSetup() {
  const { t } = useLingui()
  const { account, isOnboarded, refresh } = useAccountStore()
  const [activating, setActivating] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const { connecting: connectingStripe, connect: handleConnectStripe } = useStripeConnect()

  const isSeller = !!account?.seller
  const stripeLinked = !!account?.stripe
  const stripeDashboard = account?.stripe_testmode
    ? 'https://dashboard.stripe.com/test/'
    : 'https://dashboard.stripe.com/'

  async function handleActivate() {
    setActivating(true)
    try {
      await accountsApi.activate()
      await refresh({ force: true })
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to activate seller account`))
    } finally {
      setActivating(false)
    }
  }

  async function handleCheckStatus() {
    setCheckingStatus(true)
    try {
      const status = await accountsApi.stripeStatus()
      if (status.charges_enabled && status.payouts_enabled) {
        await refresh({ force: true })
        toast.success(t`Stripe setup complete`)
      } else {
        toast.error(t`Stripe account not fully set up yet`)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to check status`))
    } finally {
      setCheckingStatus(false)
    }
  }

  return {
    account,
    isOnboarded,
    isSeller,
    stripeLinked,
    stripeDashboard,
    activating,
    checkingStatus,
    connectingStripe,
    handleActivate,
    handleCheckStatus,
    handleConnectStripe,
  }
}
