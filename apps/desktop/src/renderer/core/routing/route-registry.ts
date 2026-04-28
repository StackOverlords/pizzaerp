import type { RouteConfig } from './types'

const _registry = new Map<string, RouteConfig>()

export const RouteRegistry = {
  register(routes: RouteConfig[]): void {
    for (const route of routes) {
      _registry.set(route.id, route)
      if (route.children) RouteRegistry.register(route.children)
    }
  },
  getRoute(id: string): RouteConfig | undefined {
    return _registry.get(id)
  },
  getAllRoutes(): RouteConfig[] {
    return Array.from(_registry.values())
  },
}
