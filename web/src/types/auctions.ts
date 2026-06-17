import type { AuctionStatus, BidStatus, Currency } from './common'

export interface Auction {
  id: string
  listing: string
  reserve: number
  instant: number
  opens: number
  closes: number
  bid: number
  bidder?: string
  bids: number
  extend: number
  extension: number
  status: AuctionStatus
  has_reserve?: boolean
  reserve_met?: boolean
  mine?: boolean
}

export interface Bid {
  id: string
  auction?: string
  listing?: string
  bidder?: string
  amount: number
  ceiling?: number
  status: BidStatus
  created: number
  mine?: boolean
  title?: string
  start_price?: number
  currency?: Currency
  current_bid?: number
  closes?: number
  auction_status?: AuctionStatus
}

export interface BidResponse {
  bid: Bid
  outbid?: boolean
  instant?: boolean
  current_bid?: number
}
