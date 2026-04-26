import { Suspense, useEffect } from 'react'
import { MemoryRouter, useNavigate, useRoutes } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { TitleBar } from '@/components/titlebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { CommandPalette } from '@/components/command-palette'
import { Toaster } from '@/components/ui/sonnet'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { ErrorFallback } from '@/components/error/ErrorFallback'
import { ConfirmDialog } from '@/core/confirm'
import { PromptDialog } from '@/core/prompt'
import { queryClient } from '@/lib/query-client'
import { routes } from '@/config/routes'
import { routerRef } from '@/core/routing/router-ref'
import { useTheme } from '@/hooks/useTheme'
import { useKeybindingBridge } from '@/core/keybindings'

function RouterBinder() {
  const navigate = useNavigate()
  useEffect(() => { routerRef.set(navigate) }, [navigate])
  return null
}

function RouterOutlet() {
  return useRoutes(routes.map((r) => ({ path: r.path, element: r.element })))
}

function Shell() {
  const { isDark } = useTheme()
  useKeybindingBridge()
  return (
    <div
      className="flex flex-col h-screen bg-background text-foreground"
      style={{ '--sidebar-offset': '2.25rem' } as React.CSSProperties}
    >
      <RouterBinder />
      <TitleBar title="MaxPizza" />
      <SidebarProvider className="flex-1 min-h-0">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
            <SidebarTrigger className="-ml-1" />
          </header>
          <ErrorBoundary fallback={({ error, reset }) => <ErrorFallback error={error} reset={reset} />}>
            <Suspense fallback={null}>
              <RouterOutlet />
            </Suspense>
          </ErrorBoundary>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" theme={isDark ? 'dark' : 'light'} richColors />
      <ConfirmDialog />
      <PromptDialog />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Shell />
        <CommandPalette />
      </MemoryRouter>
    </QueryClientProvider>
  )
}
