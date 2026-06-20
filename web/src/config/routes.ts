// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export const APP_ROUTES = {
  HOME: '/',
  LISTINGS: {
    VIEW: (id: string): string => `/listings/${id}`,
    EDIT: (id: string): string => `/listings/${id}/edit`,
    MINE: '/listings',
  },
  CHECKOUT: (id: string): string => `/checkout/${id}`,
  PURCHASES: '/purchases',
  PURCHASE: (id: string): string => `/purchases/${id}`,
  SALES: '/sales',
  SALE: (id: string): string => `/sales/${id}`,
  BIDS: '/bids',
  SAVED: '/saved',
  SUBSCRIPTIONS: '/subscriptions',
  SUBSCRIBERS: '/subscribers',
  MESSAGES: '/messages',
  REVIEWS: '/reviews',
  ACCOUNT: '/account',
  SELLER_SETTINGS: '/account/seller',
  BECOME_SELLER: '/become-seller',
  PROFILE: (id: string): string => `/account/${id}`,
} as const
