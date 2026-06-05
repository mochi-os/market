import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Check, CreditCard, ExternalLink, RefreshCw, Store } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  toast,
  getErrorMessage,
} from '@mochi/web'
import type { Fees } from '@/types'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'
import { useStripeConnect } from '@/features/selling/use-stripe-connect'
import { FeeDisclosure } from './fee-disclosure'

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

export function SellerOnboarding() {
  return <SellerSetupCard mode='activation' />
}

export function SellerSetupCard({ mode }: { mode: 'activation' | 'settings' }) {
  const { t } = useLingui()
  const {
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
  } = useSellerSetup()

  if (mode === 'activation' && isOnboarded) return null

  return (
    <Card className={mode === 'activation' ? 'mx-auto max-w-lg overflow-hidden rounded-xl' : 'overflow-hidden rounded-lg'}>
      <div className='h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40' />
      <CardContent className='p-6 space-y-6'>
        <div className='flex items-start gap-4'>
          <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <Store className='size-5' />
          </div>
          <div className='space-y-1'>
            <h2 className='text-base font-bold'>
              {mode === 'activation' ? <Trans>Become a seller</Trans> : <Trans>Seller setup</Trans>}
            </h2>
            <p className='text-sm text-muted-foreground'>
              {mode === 'activation' ? (
                <Trans>Reach buyers and sell your items on Mochi. Payments are handled securely via Stripe.</Trans>
              ) : isOnboarded ? (
                <Trans>Your seller setup is complete. You can manage Stripe or check your latest account status here.</Trans>
              ) : (
                <Trans>Complete these steps before you can list items and receive payments.</Trans>
              )}
            </p>
          </div>
        </div>

        <div className='space-y-2'>
          <Step
            number={1}
            done={isSeller}
            active={!isSeller}
            title={t`Activate seller account`}
            description={t`Create your seller profile to start listing items`}
          />
          <Step
            number={2}
            done={isOnboarded}
            active={isSeller && !isOnboarded}
            title={t`Connect Stripe`}
            description={t`Link a Stripe account to accept payments from buyers`}
          />
        </div>

        {mode === 'activation' && <SellerFeesCard />}

        {!isSeller ? (
          <Button className='w-full h-10' onClick={handleActivate} disabled={activating}>
            <Store className='size-4' />
            {activating ? t`Activating...` : t`Activate seller account`}
          </Button>
        ) : (
          <div className='space-y-3'>
            {stripeLinked && !isOnboarded && (
              <p className='text-xs text-amber-700 dark:text-amber-400'>
                <Trans>Stripe needs more information before you can accept payments. Complete the requirements on your Stripe Dashboard, then click Check status.</Trans>
              </p>
            )}
            <div className='flex gap-2'>
              {stripeLinked ? (
                <Button className='flex-1' asChild>
                  <a href={stripeDashboard} target='_blank' rel='noopener noreferrer'>
                    <ExternalLink className='size-4' />
                    {isOnboarded ? <Trans>Manage Stripe</Trans> : <Trans>Open Stripe dashboard</Trans>}
                  </a>
                </Button>
              ) : (
                <Button className='flex-1' onClick={handleConnectStripe} disabled={connectingStripe}>
                  <CreditCard className='size-4' />
                  {connectingStripe ? t`Loading...` : t`Connect Stripe`}
                </Button>
              )}
              <Button variant='outline' onClick={handleCheckStatus} disabled={checkingStatus}>
                <RefreshCw className='size-4' />
                {checkingStatus ? t`Checking...` : t`Check status`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { Step as SellerSetupStep }

export function SellerFeesCard() {
  const [fees, setFees] = useState<Fees | null>(null)

  useEffect(() => {
    accountsApi.fees().then(setFees).catch(() => {})
  }, [])

  return (
    <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
      <FeeDisclosure fees={fees} />
    </div>
  )
}

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
