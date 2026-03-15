import type { AuctionStatus, BidStatus, Currency } from './common'

export interface Auction {
  id: number
  listing: number
  reserve: number
  instant: number
  opens: number
  closes: number
  bid: number
  bidder: string
  bids: number
  extend: number
  extension: number
  status: AuctionStatus
  has_reserve?: boolean
}

export interface Bid {
  id: number
  auction: number
  bidder: string
  amount: number
  ceiling: number
  status: BidStatus
  created: number
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
