import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink, Store } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Main,
  PageHeader,
  toast,
  getErrorMessage,
} from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'
import { APP_ROUTES } from '@/config/routes'

export function SellerPage() {
  const navigate = useNavigate()
  const { isSeller, isOnboarded, refresh } = useAccountStore()
  const [loading, setLoading] = useState(false)

  async function handleActivate() {
    setLoading(true)
    try {
      await accountsApi.activate()
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
      const { url } = await accountsApi.stripeOnboarding()
      window.location.href = url
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start onboarding'))
      setLoading(false)
    }
  }

  async function handleCheckStatus() {
    setLoading(true)
    try {
      const status = await accountsApi.stripeStatus()
      if (status.charges_enabled && status.payouts_enabled) {
        await refresh()
        toast.success('Stripe setup complete')
        navigate({ to: APP_ROUTES.LISTINGS.MINE })
      } else {
        toast.error('Stripe setup not yet complete')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to check status'))
    } finally {
      setLoading(false)
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
                <h3 className='font-medium'>Complete Stripe setup</h3>
                <p className='text-sm text-muted-foreground'>
                  Set up your Stripe account to receive payments.
                </p>
                <div className='flex gap-2'>
                  <Button onClick={handleOnboarding} disabled={loading}>
                    <ExternalLink className='mr-1 size-4' />
                    {loading ? 'Loading...' : 'Complete setup'}
                  </Button>
                  <Button
                    variant='outline'
                    onClick={handleCheckStatus}
                    disabled={loading}
                  >
                    Check status
                  </Button>
                </div>
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
              <Button onClick={() => navigate({ to: APP_ROUTES.LISTINGS.CREATE })}>
                Create a listing
              </Button>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
