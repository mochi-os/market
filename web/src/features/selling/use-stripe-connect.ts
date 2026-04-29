import { useEffect, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { getErrorMessage, shellNavigateTop, toast } from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'

export function useStripeConnect() {
  const { refresh: refreshAccount } = useAccountStore()
  const [connecting, setConnecting] = useState(false)
  const oauthReturn = useSearch({ strict: false }) as {
    stripe_connected?: string
    stripe_error?: string
  }

  useEffect(() => {
    if (oauthReturn.stripe_connected) {
      toast.success('Stripe connected')
      refreshAccount()
      window.history.replaceState(null, '', window.location.pathname)
    } else if (oauthReturn.stripe_error) {
      toast.error(oauthReturn.stripe_error)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [oauthReturn.stripe_connected, oauthReturn.stripe_error, refreshAccount])

  async function connect() {
    setConnecting(true)
    try {
      const { url } = await accountsApi.stripeOnboarding(window.location.href)
      shellNavigateTop(url)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start Stripe connect'))
      setConnecting(false)
    }
  }

  return { connecting, connect }
}
