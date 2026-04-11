export const APP_ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  LISTINGS: {
    VIEW: (id: number): string => `/listings/${id}`,
    EDIT: (id: number): string => `/listings/${id}/edit`,
    MINE: '/listings/mine',
  },
  CHECKOUT: (id: number): string => `/checkout/${id}`,
  PURCHASES: '/purchases',
  PURCHASE: (id: number): string => `/purchases/${id}`,
  SALES: '/sales',
  SALE: (id: number): string => `/sales/${id}`,
  BIDS: '/bids',
  SUBSCRIPTIONS: '/subscriptions',
  SUBSCRIBERS: '/subscribers',
  MESSAGES: '/messages',
  ACCOUNT: '/account',
  PROFILE: (id: string): string => `/account/${id}`,
  SELLER: '/seller',
} as const

export type AppRoutes = typeof APP_ROUTES
