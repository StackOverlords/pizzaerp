import { lazy } from 'react'
import { LayoutDashboard, Settings } from 'lucide-react'
import type { RouteConfig } from '@/core/routing/types'

const DashboardPage = () => <div className="p-6 text-foreground">Dashboard</div>
const SettingsPage  = lazy(() => import('@/pages/settings'))

export const routes: RouteConfig[] = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    element: <DashboardPage />,
    order: 0,
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Configuración',
    icon: Settings,
    element: <SettingsPage />,
    order: 99,
    showInSidebar: true,
  },
]
