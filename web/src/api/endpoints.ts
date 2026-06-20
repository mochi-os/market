// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export const endpoints = {
  accounts: {
    get: '-/accounts/get',
    profile: '-/accounts/profile',
    update: '-/accounts/update',
    activate: '-/accounts/activate',
    fees: '-/accounts/fees',
    stripeOnboarding: '-/accounts/stripe/onboarding',
    stripeStatus: '-/accounts/stripe/status',
  },
  categories: {
    list: '-/categories/list',
  },
  listings: {
    create: '-/listings/create',
    update: '-/listings/update',
    delete: '-/listings/delete',
    removalCheck: '-/listings/removal_check',
    publish: '-/listings/publish',
    relist: '-/listings/relist',
    search: '-/listings/search',
    get: '-/listings/get',
    mine: '-/listings/mine',
    appeal: '-/listings/appeal',
  },
  shipping: {
    set: '-/shipping/set',
  },
  photos: {
    upload: '-/photos/upload',
    list: '-/photos/list',
    delete: '-/photos/delete',
    reorder: '-/photos/reorder',
  },
  assets: {
    upload: '-/assets/upload',
    external: '-/assets/external',
    remove: '-/assets/remove',
    reorder: '-/assets/reorder',
    download: '-/assets/download',
  },
  bids: {
    place: '-/bids/place',
    mine: '-/bids/mine',
  },
  orders: {
    create: '-/orders/create',
    auction: '-/orders/auction',
    purchases: '-/orders/purchases',
    sales: '-/orders/sales',
    get: '-/orders/get',
    ship: '-/orders/ship',
    confirm: '-/orders/confirm',
    dispute: '-/orders/dispute',
    refund: '-/orders/refund',
  },
  subscriptions: {
    create: '-/subscriptions/create',
    mine: '-/subscriptions/mine',
    subscribers: '-/subscriptions/subscribers',
    cancel: '-/subscriptions/cancel',
    pause: '-/subscriptions/pause',
    resume: '-/subscriptions/resume',
    reactivate: '-/subscriptions/reactivate',
  },
  threads: {
    create: '-/threads/create',
    mine: '-/threads/mine',
    get: '-/threads/get',
  },
  messages: {
    send: '-/messages/send',
    read: '-/messages/read',
  },
  reviews: {
    create: '-/reviews/create',
    respond: '-/reviews/respond',
    account: '-/reviews/account',
    inbox: '-/reviews/inbox',
    sent: '-/reviews/sent',
  },
  reports: {
    create: '-/reports/create',
  },
  disputes: {
    get: '-/disputes/get',
    respond: '-/disputes/respond',
  },
  audit: {
    object: '-/audit/object',
  },
  saved: {
    list: '-/saved/list',
    add: '-/saved/add',
    remove: '-/saved/remove',
    clear: '-/saved/clear',
  },
} as const
