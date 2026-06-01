import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useLoaderData } from '@tanstack/react-router'
import { BadgeCheck, ExternalLink, MapPin, RefreshCw, Settings, X } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  GeneralError,
  Main,
  PageHeader,
  PlacePicker,
  Textarea,
  toast,
  getErrorMessage,
  usePageTitle,
  type PlaceData,
} from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'
import { parseLocation } from '@/lib/format'
import type { Fees } from '@/types'
import { FeeDisclosure } from '@/components/shared/fee-disclosure'
import { useStripeConnect } from '@/features/selling/use-stripe-connect'

export function AccountPage() {
  const { t } = useLingui()
  usePageTitle(t`Account`)
  const { account: loaderAccount, error } = useLoaderData({
    from: '/_authenticated/account',
  })
  const { account: storeAccount, isOnboarded, refresh } = useAccountStore()
  const account = storeAccount ?? loaderAccount

  const [biography, setBiography] = useState(loaderAccount?.biography ?? '')
  const [location, setLocation] = useState(loaderAccount?.location ?? '')
  const [placePicker, setPlacePicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [fees, setFees] = useState<Fees | null>(null)

  const stripeLinked = !!account?.stripe
  const stripeDashboard = account?.stripe_testmode
    ? 'https://dashboard.stripe.com/test/'
    : 'https://dashboard.stripe.com/'
  const { connecting: connectingStripe, connect: handleConnectStripe } = useStripeConnect()

  useEffect(() => {
    if (account?.seller && !isOnboarded) {
      accountsApi.fees().then(setFees).catch(() => {})
    }
  }, [account?.seller, isOnboarded])

  const parsed = parseLocation(location)

  if (error) {
    return (
      <>
        <PageHeader icon={<Settings className='size-4 md:size-5' />} title={t`Account`} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  function handlePlaceSelect(place: PlaceData) {
    setLocation(JSON.stringify(place))
    setPlacePicker(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await accountsApi.update({ biography, location })
      await refresh()
      toast.success(t`Account updated`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to update`))
    } finally {
      setSaving(false)
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

  return (
    <>
      <PageHeader icon={<Settings className='size-4 md:size-5' />} title={t`Account`} />
      <Main>
        <div className='mx-auto max-w-lg space-y-4'>
          {account?.status === 'suspended' && (
            <Card className='rounded-lg border-amber-200 dark:border-amber-900'>
              <CardContent className='p-4 space-y-2'>
                <p className='text-sm font-medium text-amber-700 dark:text-amber-400'>
                  <Trans>Suspended as seller</Trans>
                </p>
                {account.reason && (
                  <p className='text-sm whitespace-pre-wrap text-muted-foreground'>
                    {account.reason}
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  <Trans>
                    You cannot create or edit listings, and buyers cannot place
                    new orders, bids, or subscriptions on your listings. You
                    can still buy from other sellers.
                  </Trans>
                </p>
              </CardContent>
            </Card>
          )}
          {account?.status === 'banned' && (
            <Card className='rounded-lg border-red-200 dark:border-red-900'>
              <CardContent className='p-4 space-y-2'>
                <p className='text-sm font-medium text-red-700 dark:text-red-400'>
                  <Trans>Account banned</Trans>
                </p>
                {account.reason && (
                  <p className='text-sm whitespace-pre-wrap text-muted-foreground'>
                    {account.reason}
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  <Trans>You cannot buy or sell.</Trans>
                </p>
              </CardContent>
            </Card>
          )}
          <Card className='rounded-lg'>
            <CardContent className='p-6 space-y-5'>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'><Trans>Biography</Trans></label>
                <Textarea
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  rows={3}
                  placeholder={t`Tell buyers about yourself...`}
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium'><Trans>Location</Trans></label>
                {parsed ? (
                  <div className='flex items-center gap-2 rounded-md border px-3 py-2 text-sm'>
                    <MapPin className='size-4 shrink-0 text-muted-foreground' />
                    <span className='flex-1'>{parsed.name}</span>
                    <button
                      type='button'
                      onClick={() => setLocation('')}
                      className='text-muted-foreground hover:text-foreground'
                    >
                      <X className='size-4' />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant='outline'
                    className='w-full justify-start text-muted-foreground'
                    onClick={() => setPlacePicker(true)}
                  >
                    <MapPin className='me-2 size-4' />
                    <Trans>Set location</Trans>
                  </Button>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t`Saving...` : t`Save`}
              </Button>
            </CardContent>
          </Card>

          {account?.seller ? (
            <Card className='rounded-lg'>
              <CardContent className='p-6 space-y-4'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-semibold'><Trans>Verification</Trans></span>
                  {account.verified >= 2 ? (
                    <Badge
                      variant='outline'
                      className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    >
                      <BadgeCheck className='me-1 size-3' />
                      <Trans>Verified</Trans>
                    </Badge>
                  ) : (
                    <Badge
                      variant='outline'
                      className='bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    >
                      <Trans>Not verified</Trans>
                    </Badge>
                  )}
                </div>
                {!(account.verified >= 2) && (
                  <div className='space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
                    <FeeDisclosure
                      fees={fees}
                      subtitle={stripeLinked
                        ? t`Stripe needs more information before you can accept payments. Complete the requirements on your Stripe Dashboard, then click Check status.`
                        : t`Connect Stripe to publish listings and receive payments`}
                    />
                    <div className='flex gap-2'>
                      {stripeLinked ? (
                        <Button size='sm' asChild>
                          <a href={stripeDashboard} target='_blank' rel='noopener noreferrer'>
                            <ExternalLink className='size-4' />
                            <Trans>Open Stripe dashboard</Trans>
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size='sm'
                          onClick={handleConnectStripe}
                          disabled={connectingStripe}
                        >
                          <ExternalLink className='size-4' />
                          {connectingStripe ? t`Loading...` : t`Connect Stripe`}
                        </Button>
                      )}
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={handleCheckStatus}
                        disabled={checkingStatus}
                      >
                        <RefreshCw className='size-4' />
                        {checkingStatus ? t`Checking...` : t`Check status`}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <PlacePicker
          open={placePicker}
          onOpenChange={setPlacePicker}
          onSelect={handlePlaceSelect}
        />
      </Main>
    </>
  )
}
