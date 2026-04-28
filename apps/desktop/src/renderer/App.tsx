import { useEffect } from 'react'
import { MemoryRouter, useNavigate } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { TitleBar } from '@/components/titlebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { PanelLeft } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarResizeHandle } from '@/components/sidebar-resize-handle'
import { useSidebarWidthStore } from '@/core/sidebar/use-sidebar-resize'
import { CommandPalette } from '@/components/command-palette'
import { Toaster } from '@/components/ui/sonnet'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { ErrorFallback } from '@/components/error/ErrorFallback'
import { ConfirmDialog } from '@/core/confirm'
import { PromptDialog } from '@/core/prompt'
import { queryClient } from '@/lib/query-client'
import { routerRef } from '@/core/routing/router-ref'
import { useTheme } from '@/hooks/useTheme'
import { useKeybindingBridge } from '@/core/keybindings'
import { TabContent, useTabStore, useTabsSettingsStore } from '@/core/tabs'
import { useAppearanceStore } from '@/core/appearance/appearance-store'

function RouterBinder() {
  const navigate = useNavigate()
  useEffect(() => { routerRef.set(navigate) }, [navigate])
  return null
}

function InitialTab() {
  const hasHydrated = useTabStore((s) => s._hasHydrated)
  const navigate = useNavigate()

  useEffect(() => {
    if (!hasHydrated) return
    const { restoreTabsOnStartup } = useTabsSettingsStore.getState()

    if (!restoreTabsOnStartup) {
      useTabStore.setState({ tabs: [], activeTabId: null })
      return
    }

    const { tabs, activeTabId } = useTabStore.getState()
    const active = tabs.find((tab) => tab.id === activeTabId)
    if (active) navigate(active.path)
  }, [hasHydrated])

  return null
}

function Shell() {
  const { isDark } = useTheme()
  const sidebarWidth = useSidebarWidthStore((s) => s.width)
  const fontSize = useAppearanceStore((s) => s.fontSize)
  useKeybindingBridge()

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`)
  }, [fontSize])
  return (
    <div
      className="flex flex-col h-screen bg-background text-foreground"
      style={{ '--sidebar-offset': '2.25rem' } as React.CSSProperties}
    >
      <RouterBinder />
      <InitialTab />
      <TitleBar title="MaxPizza" />
      <SidebarProvider
        className="flex-1 min-h-0"
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarResizeHandle />
        <SidebarInset className="flex flex-col min-h-0">
          <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-1 h-7 w-7"
              onClick={() => useSidebarWidthStore.getState().toggle()}
            >
              <PanelLeft size={16} />
            </Button>
          </header>
          <ErrorBoundary fallback={({ error, reset }) => <ErrorFallback error={error} reset={reset} />}>
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <TabContent />
            </div>
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
