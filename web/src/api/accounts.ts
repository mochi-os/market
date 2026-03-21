import type { Account } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const accountsApi = {
  get: (id?: string) =>
    client
      .post<{ data: Account }>(endpoints.accounts.get, id ? { id } : {})
      .then((r) => r.data),

  update: (params: Record<string, unknown>) =>
    client
      .post<{ data: Account }>(endpoints.accounts.update, params)
      .then((r) => r.data),

  activate: (returnUrl?: string) =>
    client
      .post<{ data: { account: Account; onboarding_url?: string } }>(
        endpoints.accounts.activate,
        returnUrl ? { return_url: returnUrl } : {}
      )
      .then((r) => r.data),

  stripeOnboarding: (returnUrl: string) =>
    client
      .post<{ data: { onboarding_url: string } }>(endpoints.accounts.stripeOnboarding, { return_url: returnUrl })
      .then((r) => r.data),

  stripeStatus: () =>
    client
      .post<{
        data: { charges_enabled: boolean; payouts_enabled: boolean }
      }>(endpoints.accounts.stripeStatus, {})
      .then((r) => r.data),
}
