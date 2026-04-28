import { useLocation } from 'react-router'
import { useTabStore } from '@/core/tabs'
import type { RouteConfig } from './types'

function pathMatches(route: RouteConfig, pathname: string): boolean {
  if (!route.path) return false
  if (route.path === '/') return pathname === '/'
  return pathname === route.path || pathname.startsWith(route.path + '/')
}

export function useActiveRoute() {
  const { pathname } = useLocation()
  const activeTabId = useTabStore((s) => s.activeTabId)
  const tabs = useTabStore((s) => s.tabs)

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null

  const isRouteActive = (route: RouteConfig): boolean => pathMatches(route, pathname)

  const isChildActive = (route: RouteConfig): boolean =>
    (route.children ?? []).some((child) => pathMatches(child, pathname))

  const isRouteOpen = (routeId: string): boolean =>
    tabs.some((t) => t.routeId === routeId)

  const isRouteTabActive = (routeId: string): boolean =>
    activeTab?.routeId === routeId

  return { activeTab, activeTabId, isRouteActive, isChildActive, isRouteOpen, isRouteTabActive }
}
