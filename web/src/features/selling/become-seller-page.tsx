import { useEffect } from 'react'
import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { Store } from 'lucide-react'
import { Main, PageHeader, usePageTitle } from '@mochi/web'
import { APP_ROUTES } from '@/config/routes'
import { useAccountStore } from '@/stores/account-store'
import { SellerOnboarding } from '@/components/shared/seller-onboarding'

export function BecomeSellerPage() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { isSeller } = useAccountStore()
  usePageTitle(t`Become a seller`)

  useEffect(() => {
    if (isSeller) {
      void navigate({ to: APP_ROUTES.SELLER_SETTINGS })
    }
  }, [isSeller, navigate])

  if (isSeller) return null

  return (
    <>
      <PageHeader icon={<Store className='size-4 md:size-5' />} title={t`Become a seller`} />
      <Main>
        <SellerOnboarding />
      </Main>
    </>
  )
}
