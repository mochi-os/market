import { StrictMode, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import {
  CommandMenu,
  createQueryClient,
  SearchProvider,
  ThemeProvider,
  useAuthStore,
  isInShell,
  getAppPath,
  getRouterBasepath,
} from '@mochi/web'
import { buildSidebarData } from './components/layout/data/sidebar-data'
import { useAccountStore } from './stores/account-store'
// Generated Routes
import { routeTree } from './routeTree.gen'
// Styles
import './styles/index.css'

const queryClient = createQueryClient()

function getBasepath(): string {
  const appPath = getAppPath()
  if (appPath) return appPath + '/'
  return getRouterBasepath()
}

const router = createRouter({
  routeTree,
  context: { queryClient },
  basepath: getBasepath(),
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

if (!isInShell()) {
  useAuthStore.getState().initialize()
}

function MarketCommandMenu() {
  const { isSeller } = useAccountStore()
  const sidebarData = useMemo(() => buildSidebarData({ isSeller }), [isSeller])
  return <CommandMenu sidebarData={sidebarData} />
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SearchProvider>
            <RouterProvider router={router} />
            <MarketCommandMenu />
          </SearchProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
