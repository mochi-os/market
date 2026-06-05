import { APP_ROUTES } from '@/config/routes'

export function scrollToSellerOnboarding() {
  document
    .getElementById(APP_ROUTES.SELLER_ONBOARDING_HASH)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function isSellerOnboardingHash(hash: string) {
  return hash === APP_ROUTES.SELLER_ONBOARDING_HASH || hash === `#${APP_ROUTES.SELLER_ONBOARDING_HASH}`
}
