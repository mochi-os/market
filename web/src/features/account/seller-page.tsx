import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink, Loader2, Store } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Main,
  PageHeader,
  toast,
  getErrorMessage,
  usePageTitle,
} from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { listingsApi } from '@/api/listings'
import { useAccountStore } from '@/stores/account-store'
import { APP_ROUTES } from '@/config/routes'

export function SellerPage() {
  usePageTitle('Become a seller')
  const navigate = useNavigate()
  const { isSeller, isOnboarded, refresh } = useAccountStore()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)
  const awaitingOnboarding = useRef(false)

  async function handleCreateListing() {
    setCreating(true)
    try {
      const listing = await listingsApi.create({ title: '' })
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create listing'))
      setCreating(false)
    }
  }

  // Auto-check status when page loads (returning from Stripe) or tab regains focus
  useEffect(() => {
    if (isSeller && !isOnboarded) {
      checkStatus()
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && (awaitingOnboarding.current || (isSeller && !isOnboarded))) {
        awaitingOnboarding.current = false
        checkStatus()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [isSeller, isOnboarded])

  async function handleActivate() {
    setLoading(true)
    try {
      const result = await accountsApi.activate(
        window.location.origin + '/market/seller'
      )
      if (result.onboarding_url) {
        awaitingOnboarding.current = true
        window.open(result.onboarding_url, '_blank')
        setLoading(false)
        return
      }
      await refresh()
      toast.success('Seller account activated')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to activate'))
    } finally {
      setLoading(false)
    }
  }

  async function handleOnboarding() {
    setLoading(true)
    try {
      const { onboarding_url } = await accountsApi.stripeOnboarding(
        window.location.origin + '/market/seller'
      )
      awaitingOnboarding.current = true
      window.open(onboarding_url, '_blank')
      setLoading(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start onboarding'))
      setLoading(false)
    }
  }

  async function checkStatus() {
    setChecking(true)
    try {
      const status = await accountsApi.stripeStatus()
      if (status.charges_enabled && status.payouts_enabled) {
        await refresh()
        toast.success('Stripe setup complete')
        navigate({ to: APP_ROUTES.LISTINGS.MINE })
      } else {
        setChecking(false)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to check status'))
      setChecking(false)
    }
  }

  if (!isSeller) {
    return (
      <>
        <PageHeader icon={<Store className='size-4 md:size-5' />} title='Become a seller' />
        <Main>
          <div className='max-w-md space-y-4'>
            <Card className='rounded-[10px]'>
              <CardContent className='p-4 space-y-3'>
                <h3 className='font-medium'>Start selling on Market</h3>
                <p className='text-sm text-muted-foreground'>
                  Activate your seller account to create listings and receive
                  payments.
                </p>
                <Button onClick={handleActivate} disabled={loading}>
                  {loading ? 'Activating...' : 'Activate seller account'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </Main>
      </>
    )
  }

  if (!isOnboarded) {
    return (
      <>
        <PageHeader icon={<Store className='size-4 md:size-5' />} title='Seller setup' />
        <Main>
          <div className='max-w-md space-y-4'>
            <Card className='rounded-[10px]'>
              <CardContent className='p-4 space-y-3'>
                {checking ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='size-4 animate-spin' />
                    <span className='text-sm'>Checking Stripe status...</span>
                  </div>
                ) : (
                  <>
                    <h3 className='font-medium'>Complete Stripe setup</h3>
                    <p className='text-sm text-muted-foreground'>
                      Set up your Stripe account to receive payments. A new tab
                      will open for Stripe onboarding.
                    </p>
                    <div className='flex gap-2'>
                      <Button onClick={handleOnboarding} disabled={loading}>
                        <ExternalLink className='mr-1 size-4' />
                        {loading ? 'Loading...' : 'Complete setup'}
                      </Button>
                      <Button
                        variant='outline'
                        onClick={checkStatus}
                        disabled={loading}
                      >
                        Check status
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <PageHeader icon={<Store className='size-4 md:size-5' />} title='Seller setup' />
      <Main>
        <div className='max-w-md'>
          <Card className='rounded-[10px]'>
            <CardContent className='p-4 space-y-3'>
              <h3 className='font-medium'>Setup complete</h3>
              <p className='text-sm text-muted-foreground'>
                Your seller account is fully set up. You can now create
                listings.
              </p>
              <Button onClick={handleCreateListing} disabled={creating}>
                {creating ? 'Creating...' : 'Create a listing'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
