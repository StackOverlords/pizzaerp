import { lazy } from 'react'
import { Navigate } from 'react-router'
import {
  Building2,
  ChartBar,
  ClipboardList,
  Clock,
  ClockArrowUp,
  History,
  LayoutDashboard,
  Leaf,
  Package,
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
const OrdersListPage = lazy(() => import('@/pages/OrdersList'))
const OrdersNewPage = lazy(() => import('@/pages/OrdersNew'))
const MenuProductsPage = lazy(() => import('@/pages/MenuProducts'))
const MenuCategoriesPage = lazy(() => import('@/pages/MenuCategories'))
const MenuCombosPage = lazy(() => import('@/pages/MenuCombos'))
const MenuIngredientsPage = lazy(() => import('@/pages/MenuIngredients'))
const StaffUsersPage = lazy(() => import('@/pages/StaffUsers'))
const StaffBranchesPage = lazy(() => import('@/pages/StaffBranches'))
const SupplyTypesPage = lazy(() => import('@/pages/SupplyTypes'))
const SupplyTransfersPage = lazy(() => import('@/pages/SupplyTransfers'))
const SupplyWastagesPage = lazy(() => import('@/pages/SupplyWastages'))
const SupplyClosingsPage = lazy(() => import('@/pages/SupplyClosings'))
const ReportsPage = lazy(() => import('@/pages/Reports'))

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
        element: <OrdersListPage />,
        component: OrdersListPage,
        order: 0,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'orders.new',
        path: '/orders/new',
        label: 'Nueva orden',
        icon: ShoppingCart,
        element: <OrdersNewPage />,
        component: OrdersNewPage,
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
        element: <MenuProductsPage />,
        component: MenuProductsPage,
        roles: ['ADMIN'],
        order: 0,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'menu.categories',
        path: '/menu/categories',
        label: 'Categorías',
        element: <MenuCategoriesPage />,
        component: MenuCategoriesPage,
        roles: ['ADMIN'],
        order: 1,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'menu.combos',
        path: '/menu/combos',
        label: 'Combos',
        element: <MenuCombosPage />,
        component: MenuCombosPage,
        roles: ['ADMIN'],
        order: 2,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'menu.ingredients',
        path: '/menu/ingredients',
        label: 'Ingredientes',
        icon: Leaf,
        element: <MenuIngredientsPage />,
        component: MenuIngredientsPage,
        roles: ['ADMIN'],
        order: 3,
        tabConfig: { singleton: true, closable: true },
      },
    ],
  },
  {
    id: 'supply',
    path: '/supply',
    label: 'Insumos',
    icon: Package,
    element: <Navigate to="/supply/types" replace />,
    order: 3,
    children: [
      {
        id: 'supply.types',
        path: '/supply/types',
        label: 'Tipos',
        element: <SupplyTypesPage />,
        component: SupplyTypesPage,
        roles: ['ADMIN'],
        order: 0,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'supply.transfers',
        path: '/supply/transfers',
        label: 'Transferencias',
        element: <SupplyTransfersPage />,
        component: SupplyTransfersPage,
        order: 1,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'supply.wastages',
        path: '/supply/wastages',
        label: 'Mermas',
        element: <SupplyWastagesPage />,
        component: SupplyWastagesPage,
        order: 2,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'supply.closings',
        path: '/supply/closings',
        label: 'Cierre diario',
        element: <SupplyClosingsPage />,
        component: SupplyClosingsPage,
        roles: ['ADMIN'],
        order: 3,
        tabConfig: { singleton: true, closable: true },
      },
    ],
  },
  {
    id: 'staff',
    path: '/staff',
    label: 'Personal',
    icon: Users,
    element: <Navigate to="/staff/users" replace />,
    order: 4,
    children: [
      {
        id: 'staff.users',
        path: '/staff/users',
        label: 'Usuarios',
        icon: Users,
        element: <StaffUsersPage />,
        component: StaffUsersPage,
        roles: ['ADMIN'],
        order: 0,
        tabConfig: { singleton: true, closable: true },
      },
      {
        id: 'staff.branches',
        path: '/staff/branches',
        label: 'Sucursales',
        icon: Building2,
        element: <StaffBranchesPage />,
        component: StaffBranchesPage,
        roles: ['ADMIN'],
        order: 1,
        tabConfig: { singleton: true, closable: true },
      },
    ],
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reportes',
    icon: ChartBar,
    element: <ReportsPage />,
    component: ReportsPage,
    roles: ['ADMIN'],
    order: 5,
    tabConfig: { singleton: true, closable: true },
  },
  {
    id: 'shifts',
    path: '/shifts',
    label: 'Turnos',
    icon: Clock,
    element: <Navigate to="/shifts/current" replace />,
    order: 6,
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
