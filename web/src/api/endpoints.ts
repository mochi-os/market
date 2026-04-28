export const endpoints = {
  accounts: {
    get: '-/accounts/get',
    update: '-/accounts/update',
    activate: '-/accounts/activate',
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
  auctions: {
    get: '-/auctions/get',
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
    resume: '-/orders/resume',
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
  notifications: {
    check: '-/notifications/check',
  },
  audit: {
    object: '-/audit/object',
  },
} as const
