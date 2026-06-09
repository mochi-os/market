import { useEffect, type ReactNode, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckCircle2, CreditCard, ExternalLink, RefreshCw, Settings, Store } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Main,
  PageHeader,
  usePageTitle,
} from '@mochi/web'
import type { Fees } from '@/types'
import { accountsApi } from '@/api/accounts'
import { FeeDisclosure } from '@/components/shared/fee-disclosure'
import {
  SellerSetupStep,
  useSellerSetup,
} from '@/components/shared/seller-onboarding'
import { useAccountStore } from '@/stores/account-store'

export function SellerSettingsPage() {
  const { t } = useLingui()
  const { account, isOnboarded } = useAccountStore()
  const [fees, setFees] = useState<Fees | null>(null)
  const {
    isSeller,
    stripeLinked,
    stripeDashboard,
    checkingStatus,
    connectingStripe,
    activating,
    handleActivate,
    handleCheckStatus,
    handleConnectStripe,
  } = useSellerSetup()

  const isSellerReady = isSeller && isOnboarded
  const isSuspended = account?.status === 'suspended'
  const isBanned = account?.status === 'banned'
  const pageTitle = isSeller ? t`Seller settings` : t`Become a seller`
  const statusLabel = isBanned
    ? t`Banned`
    : isSuspended
      ? t`Suspended`
      : isSellerReady
        ? t`Active`
        : isSeller
          ? t`Setup incomplete`
          : t`Not activated`

  usePageTitle(pageTitle)

  useEffect(() => {
    accountsApi.fees().then(setFees).catch(() => {})
  }, [])

  return (
    <>
      <PageHeader icon={<Settings className='size-4 md:size-5' />} title={pageTitle} />
      <Main>
        <div className='mx-auto w-full max-w-5xl space-y-6'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-1'>
              <h1 className='text-xl font-semibold'>{pageTitle}</h1>
              <p className='text-sm text-muted-foreground'>
                {isSeller ? (
                  <Trans>Manage your seller account and payment setup.</Trans>
                ) : (
                  <Trans>Activate a seller account to list items and receive payments.</Trans>
                )}
              </p>
            </div>
            {isSeller && (
              <StatusBadge
                isBanned={isBanned}
                isSuspended={isSuspended}
                isSellerReady={isSellerReady}
              />
            )}
          </div>

          <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start'>
            <Card className='overflow-hidden rounded-xl'>
              <div className='h-1 bg-gradient-to-r from-primary/25 via-primary to-primary/25' />
              <CardContent className='space-y-6 p-6'>
                <div className='flex items-start gap-4'>
                  <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                    <Store className='size-5' />
                  </div>
                  <div className='space-y-1'>
                    <h2 className='text-base font-semibold'>
                      {isSeller ? <Trans>Seller setup</Trans> : <Trans>Become a seller</Trans>}
                    </h2>
                    <p className='text-sm text-muted-foreground'>
                      {!isSeller ? (
                        <Trans>Create your seller profile before connecting payments.</Trans>
                      ) : isSellerReady ? (
                        <Trans>Your seller setup is complete. You can manage Stripe or check your latest account status here.</Trans>
                      ) : (
                        <Trans>Connect Stripe before listing items.</Trans>
                      )}
                    </p>
                  </div>
                </div>

                <div className='space-y-2'>
                  <SellerSetupStep
                    number={1}
                    done={isSeller}
                    active={!isSeller}
                    title={t`Activate seller account`}
                    description={t`Create your seller profile to start listing items`}
                  />
                  <SellerSetupStep
                    number={2}
                    done={isOnboarded}
                    active={isSeller && !isOnboarded}
                    title={t`Connect Stripe`}
                    description={t`Link a Stripe account to accept payments from buyers`}
                  />
                </div>

                <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
                  <FeeDisclosure fees={fees} />
                </div>

                {isSeller && stripeLinked && !isOnboarded && (
                  <p className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300'>
                    <Trans>Stripe needs more information before you can accept payments. Complete the requirements on your Stripe Dashboard, then click Check status.</Trans>
                  </p>
                )}

                <div className='flex flex-col gap-2 sm:flex-row'>
                  {!isSeller ? (
                    <Button className='flex-1' onClick={handleActivate} disabled={activating}>
                      <Store className='size-4' />
                      {activating ? t`Activating...` : t`Activate seller account`}
                    </Button>
                  ) : stripeLinked ? (
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
                  {isSeller && (
                    <Button variant='outline' onClick={handleCheckStatus} disabled={checkingStatus}>
                      <RefreshCw className='size-4' />
                      {checkingStatus ? t`Checking...` : t`Check status`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <aside className='space-y-6 lg:pt-1'>
              <SummarySection title={t`Account status`} value={statusLabel}>
                {(isBanned || isSuspended) && account?.reason && (
                  <p className='whitespace-pre-wrap text-xs text-muted-foreground'>
                    {account.reason}
                  </p>
                )}
              </SummarySection>

              <SummarySection
                title={t`Payments`}
                value={
                  !isSeller
                    ? t`Activate seller account first`
                    : isOnboarded
                      ? t`Stripe connected`
                      : stripeLinked
                        ? t`Stripe needs more information`
                        : t`Stripe not connected`
                }
              />

              <SummarySection
                title={t`Fees`}
                value={fees ? t`${fees.platform}% per sale` : t`Loading fee details...`}
              >
                {fees && (
                  <p className='text-xs text-muted-foreground'>
                    <Trans>Stripe processing fees come out of the remainder.</Trans>
                  </p>
                )}
              </SummarySection>

              {isSeller && (
                <div className='rounded-lg border border-dashed bg-muted/20 p-4 text-sm'>
                  <p className='font-medium'><Trans>Future seller controls</Trans></p>
                  <p className='mt-1 text-muted-foreground'>
                    <Trans>More seller account controls will appear here as they become available.</Trans>
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </Main>
    </>
  )
}

function SummarySection({
  title,
  value,
  children,
}: {
  title: string
  value: string
  children?: ReactNode
}) {
  return (
    <section className='space-y-1.5 border-b pb-5 last:border-b-0 last:pb-0'>
      <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
        {title}
      </p>
      <p className='text-sm font-semibold'>{value}</p>
      {children}
    </section>
  )
}

function StatusBadge({
  isBanned,
  isSuspended,
  isSellerReady,
}: {
  isBanned: boolean
  isSuspended: boolean
  isSellerReady: boolean
}) {
  if (isBanned) {
    return (
      <Badge variant='outline' className='border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-900/30 dark:text-red-400'>
        <Trans>Banned</Trans>
      </Badge>
    )
  }

  if (isSuspended) {
    return (
      <Badge variant='outline' className='border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-400'>
        <Trans>Suspended</Trans>
      </Badge>
    )
  }

  if (isSellerReady) {
    return (
      <Badge variant='outline' className='border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-900/30 dark:text-green-400'>
        <CheckCircle2 className='me-1 size-3' />
        <Trans>Active</Trans>
      </Badge>
    )
  }

  return (
    <Badge variant='outline' className='border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-400'>
      <Trans>Setup incomplete</Trans>
    </Badge>
  )
}
