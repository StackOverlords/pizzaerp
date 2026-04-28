import { memo, Suspense } from 'react'
import type { FC } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { ErrorFallback } from '@/components/error/ErrorFallback'
import { RouteRegistry } from '@/core/routing/route-registry'
import { openRoute } from '../open-route'
import { useTabStore } from '../store/tab-store'
import { TabContext } from '../hooks/use-tab-context'
import type { TabInstance } from '../types'

const TabSkeleton = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-32 w-full" />
  </div>
)

const NotFound = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center text-muted-foreground">
      <p className="text-lg font-medium">Página no encontrada</p>
    </div>
  </div>
)

const TabRenderer = memo(
  ({ tab, isActive }: { tab: TabInstance; isActive: boolean }) => {
    const route = RouteRegistry.getRoute(tab.routeId)
    const Component = route?.component
    const keepMounted = route?.tabConfig?.keepMounted ?? false
    const shouldRender = isActive || keepMounted

    return (
      <TabContext.Provider value={{ tabId: tab.id, isActive }}>
        <div
          className="h-full"
          style={!isActive && keepMounted ? { opacity: 0, pointerEvents: 'none' } : undefined}
        >
          <ErrorBoundary fallback={({ error, reset }) => <ErrorFallback error={error} reset={reset} />}>
            <Suspense fallback={<TabSkeleton />}>
              {shouldRender ? (Component ? <Component /> : <NotFound />) : null}
            </Suspense>
          </ErrorBoundary>
        </div>
      </TabContext.Provider>
    )
  },
  (prev, next) =>
    prev.tab.id === next.tab.id &&
    prev.isActive === next.isActive &&
    prev.tab.routeId === next.tab.routeId
)
TabRenderer.displayName = 'TabRenderer'

const EmptyTabs: FC = () => {
  const routes = RouteRegistry.getAllRoutes().filter(
    (r) => r.showInSidebar !== false && !r.id.includes('.')
  )

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8 select-none">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Sin pestañas abiertas</p>
        <p className="text-xs text-muted-foreground">Seleccioná una sección para comenzar</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 max-w-sm">
        {routes.map((route) => {
          const Icon = route.icon
          return (
            <button
              key={route.id}
              onClick={() => openRoute(route.id)}
              className="flex flex-col items-center gap-2 p-4 w-24 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              {Icon && <Icon className="size-5 text-muted-foreground" />}
              <span className="text-xs text-center leading-tight">{route.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const TabContent: FC = () => {
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)

  if (tabs.length === 0) return <EmptyTabs />

  return (
    <div className="h-full relative">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="absolute inset-0"
          style={{ zIndex: tab.id === activeTabId ? 1 : 0 }}
        >
          <TabRenderer tab={tab} isActive={tab.id === activeTabId} />
        </div>
      ))}
    </div>
  )
}

export default TabContent
