import { StrictMode } from 'react'
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
import { sidebarData } from './components/layout/data/sidebar-data'
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

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SearchProvider>
            <RouterProvider router={router} />
            <CommandMenu sidebarData={sidebarData} />
          </SearchProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
