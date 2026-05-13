import { lazy } from 'react'
import { Navigate } from 'react-router'
import {
  ChartBar,
  ClipboardList,
  Clock,
  ClockArrowUp,
  History,
  LayoutDashboard,
  Pizza,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react'
import type { RouteConfig } from '@/core/routing/types'
import { RouteRegistry } from '@/core/routing/route-registry'

const SetupPage = lazy(() => import('@/pages/Setup'))
const ShiftsCurrentPage = lazy(() => import('@/pages/ShiftsCurrent'))
const ShiftsHistoryPage = lazy(() => import('@/pages/ShiftsHistory'))

const Placeholder = ({ label }: { label: string }) => (
  <div className="p-6 text-foreground text-sm text-muted-foreground">{label}</div>
)

const DashboardPage = () => <Placeholder label="Dashboard" />
const SettingsPage = lazy(() => import('@/pages/settings'))

export const routes: RouteConfig[] = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    element: <DashboardPage />,
    component: DashboardPage,
    order: 0,
    tabConfig: { singleton: true, closable: true },
  },
  {
    id: 'orders',
    path: '/orders',
    label: 'Órdenes',
    icon: ShoppingCart,
    element: <Placeholder label="Órdenes" />,
    order: 1,
    children: [
      {
        id: 'orders.list',
        path: '/orders/list',
        label: 'Ver órdenes',
        icon: ClipboardList,
        element: <Placeholder label="Lista de órdenes" />,
        order: 0,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'orders.new',
        path: '/orders/new',
        label: 'Nueva orden',
        icon: ShoppingCart,
        element: <Placeholder label="Nueva orden" />,
        order: 1,
      },
    ],
  },
  {
    id: 'menu',
    path: '/menu',
    label: 'Menú',
    icon: Pizza,
    element: <Placeholder label="Menú" />,
    order: 2,
    children: [
      {
        id: 'menu.products',
        path: '/menu/products',
        label: 'Productos',
        element: <Placeholder label="Productos" />,
        order: 0,
        tabConfig: { singleton: true },
      },
      {
        id: 'menu.categories',
        path: '/menu/categories',
        label: 'Categorías',
        element: <Placeholder label="Categorías" />,
        order: 1,
        tabConfig: { singleton: true },
      },
    ],
  },
  {
    id: 'staff',
    path: '/staff',
    label: 'Personal',
    icon: Users,
    element: <Placeholder label="Personal" />,
    order: 3,
    tabConfig: { singleton: true },
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reportes',
    icon: ChartBar,
    element: <Placeholder label="Reportes" />,
    order: 4,
    tabConfig: { singleton: true },
  },
  {
    id: 'shifts',
    path: '/shifts',
    label: 'Turnos',
    icon: Clock,
    element: <Navigate to="/shifts/current" replace />,
    order: 5,
    children: [
      {
        id: 'shifts.current',
        path: '/shifts/current',
        label: 'Mi turno',
        icon: ClockArrowUp,
        element: <ShiftsCurrentPage />,
        component: ShiftsCurrentPage,
        roles: ['CAJERO', 'ADMIN'],
        order: 0,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'shifts.history',
        path: '/shifts/history',
        label: 'Historial',
        icon: History,
        element: <ShiftsHistoryPage />,
        component: ShiftsHistoryPage,
        roles: ['ADMIN'],
        order: 1,
        tabConfig: { singleton: true, closable: true },
      },
    ],
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Configuración',
    icon: Settings,
    element: <SettingsPage />,
    component: SettingsPage,
    order: 99,
    showInSidebar: false,
    tabConfig: { singleton: true },
  },
  {
    id: 'setup',
    path: '/setup',
    label: 'Configuración inicial',
    element: <SetupPage />,
    component: SetupPage,
    order: 100,
    showInSidebar: false,
  },
]

RouteRegistry.register(routes)
