import type { Auction, Bid, BidResponse } from '@/types'
import { client } from './client'
import { endpoints } from './endpoints'

export const auctionsApi = {
  get: (listing: number) =>
    client
      .post<{ data: { auction: Auction; bids: Bid[] } }>(
        endpoints.auctions.get,
        { listing }
      )
      .then((r) => r.data),
}

export const bidsApi = {
  place: (params: { auction: number; amount: number; ceiling?: number }) =>
    client
      .post<{ data: BidResponse }>(endpoints.bids.place, params)
      .then((r) => r.data),

  mine: (params: { status?: string; page?: number; limit?: number }) =>
    client
      .post<{ data: { bids: Bid[]; total: number } }>(
        endpoints.bids.mine,
        params
      )
      .then((r) => r.data),
}
