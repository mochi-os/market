// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { Check } from 'lucide-react'
import {
  toast,
  getErrorMessage,
} from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'
import { useStripeConnect } from '@/features/selling/use-stripe-connect'

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
      await refresh()
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
        await refresh()
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

export { Step as SellerSetupStep }

function Step({
  number,
  done,
  active,
  title,
  description,
}: {
  number: number
  done: boolean
  active: boolean
  title: string
  description: string
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        done
          ? 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20'
          : active
            ? 'border-primary/30 bg-primary/5'
            : 'border-border opacity-40'
      }`}
    >
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? 'bg-green-500 text-white'
            : active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {done ? <Check className='size-3.5' /> : number}
      </div>
      <div className='min-w-0'>
        <p className={`text-sm font-medium ${done ? 'text-green-700 dark:text-green-400' : ''}`}>
          {title}
        </p>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
    </div>
  )
}
