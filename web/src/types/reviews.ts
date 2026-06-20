// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

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
