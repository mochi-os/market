export interface Review {
  id: string
  order: string
  reviewer: string
  subject: string
  role: string
  rating: number
  text: string
  response: string
  visible: number
  status: string
  created: number
}

export interface InboxReview extends Review {
  reviewer_name: string
  listing_title?: string
}

export interface SentReview extends Review {
  subject_name: string
  listing_title?: string
}
