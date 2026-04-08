import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import {
  Toaster,
  NotificationTitle,
  GeneralError,
  NotFoundError,
} from '@mochi/web'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    return (
      <>
        <NotificationTitle />
        <div className='bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 px-4 py-2 text-center text-sm'>
          <p className='font-medium'>This app is in test mode. Do not use it for real sales or purchases.</p>
          <p>Make test purchases with card 4242 4242 4242 4242, with any future expiry and any security code.</p>
        </div>
        <Outlet />
        <Toaster duration={5000} />
        {import.meta.env.MODE === 'development' && (
          <>
            <ReactQueryDevtools buttonPosition='bottom-left' />
            <TanStackRouterDevtools position='bottom-right' />
          </>
        )}
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
