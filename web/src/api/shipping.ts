import type { ShippingOption } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export type ShippingOptionInput = Omit<ShippingOption, 'id' | 'listing'>

export const shippingApi = {
  set: (listing: number, options: ShippingOptionInput[]) =>
    client.post<unknown>(endpoints.shipping.set, {
      listing,
      options: JSON.stringify(options),
    }),
}
