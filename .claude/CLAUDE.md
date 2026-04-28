Nunca pongas en los commits: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

# MaxPizza — Conventions

## Stack
Electron + React 19 + Vite · TypeScript strict · Tailwind + shadcn · React Router 7 (MemoryRouter) · Zustand 5 · TanStack Query · Axios · Zod · React Hook Form

---

## Folder structure

```
src/
├── main/          # Electron main process
│   └── ipc/       # IPC handlers por dominio
├── preload/
│   └── api/       # Bridge namespaced: window.electron.window / .theme / .storage
└── renderer/
    ├── core/      # Infraestructura transversal (no toca dominio)
    │   ├── commands/   # CommandRegistry
    │   ├── http/       # Axios client + query-keys factory
    │   ├── auth/       # Auth store + usePermissions
    │   └── routing/    # RouteConfig type + guards
    ├── features/  # Módulos de negocio (orders, menu, staff…)
    │   └── orders/
    │       ├── api.ts        # TanStack Query hooks
    │       ├── schemas.ts    # Zod types
    │       ├── store.ts      # Zustand (solo si hay estado local del módulo)
    │       └── components/
    ├── components/    # Componentes globales reutilizables
    │   └── ui/        # shadcn — NO modificar
    ├── pages/         # Una página por ruta
    ├── config/
    │   └── routes.tsx # Fuente única de verdad de rutas
    └── lib/
        └── storage/   # Adapter electron-store
```

---

## TypeScript

```ts
// ✅ Siempre: const object → tipo derivado
const ORDER_STATUS = { PENDING: 'pending', DONE: 'done' } as const
type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

// ❌ Nunca: union literal directo
type OrderStatus = 'pending' | 'done'

// ✅ Interfaces planas — objetos anidados → interfaz propia
interface Order { id: string; customer: Customer }   // Customer = interfaz separada
// ❌ interface Order { customer: { name: string } }

// ✅ import type para tipos
import type { Order } from './schemas'
```

---

## Commands

Toda acción significativa se registra en `CommandRegistry`. Naming: `{feature}.action.{verbNoun}`.

```ts
// core/commands/default-commands.ts  ← comandos workbench
commandRegistry.register('workbench.action.toggleSidebar', 'Toggle Sidebar', handler)

// features/orders/index.ts  ← comandos del módulo
commandRegistry.register('orders.action.create',   'Nueva orden',   handler)
commandRegistry.register('orders.action.viewList', 'Ver órdenes',   handler)
```

Ejecutar desde cualquier lado: `commandRegistry.execute('orders.action.create')`

---

## HTTP / Query Keys

Toda request usa el cliente Axios en `core/http/client.ts`.
Las keys de caché viven en `core/http/query-keys.ts` — **nunca strings sueltos**.

```ts
// ✅ Siempre via factory
useQuery({ queryKey: queryKeys.orders.list(filters) })
queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })

// ❌ Nunca
useQuery({ queryKey: ['orders', 'list'] })
```

---

## UI Components

**Siempre usar los componentes de `components/ui/`** — nunca construir desde cero lo que ya existe.

```ts
// ✅ Usar primitivos existentes
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ❌ Nunca
<button className="bg-blue-500 ...">   // html nativo con estilos manuales
<input className="border rounded ..." />
```

Antes de crear un componente nuevo → revisar `components/ui/`. Si no existe ahí, usar shadcn para agregarlo.

---

## Features

Estructura de un módulo completo:

```
features/settings/
├── index.ts          # registra comandos del módulo en CommandRegistry
├── api.ts            # TanStack Query hooks (si hay backend)
├── schemas.ts        # Zod types + const enums
├── store.ts          # Zustand (solo si hay estado local persistente)
└── components/       # componentes específicos del módulo
    ├── SettingsLayout.tsx
    └── sections/
        └── GeneralSection.tsx
```

El hook ES el servicio — no hay `service.ts` separado:

```ts
// features/orders/api.ts
export const useOrders = (filters?: OrderFilters) =>
  useQuery({ queryKey: queryKeys.orders.list(filters), queryFn: () => ... })

export const useCreateOrder = () =>
  useMutation({ mutationFn: ..., onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() }) })
```

### Checklist al crear un módulo nuevo

1. `features/X/schemas.ts` — tipos Zod
2. `features/X/api.ts` — hooks TanStack Query (si hay backend)
3. `features/X/store.ts` — Zustand (solo si necesitás estado local)
4. `features/X/index.ts` — registrar comandos en `commandRegistry`
5. `features/X/components/` — UI usando `components/ui/`
6. `pages/X.tsx` — página que compone los componentes
7. `config/routes.tsx` — agregar la ruta con `id`, `permissions`, `icon`
8. `core/http/query-keys.ts` — agregar keys del módulo
9. `core/events/event-bus.ts` — agregar eventos del módulo a `AppEvents`
10. `main.tsx` — importar `features/X/index.ts` para registrar comandos

---

## Routing

`config/routes.tsx` es la **única fuente de verdad** — sidebar y router leen el mismo array.

```ts
interface RouteConfig {
  id: string          // referenciado por el backend para permisos
  path: string
  label: string
  icon?: LucideIcon
  element: ReactNode
  showInSidebar?: boolean   // default true
  permissions?: string[]    // ej: ['orders:read']
  roles?: string[]
  order?: number
  group?: string
}
```

---

## Permisos

```ts
// ✅ En componentes
const { hasPermission } = usePermissions()
if (!hasPermission('orders:write')) return null

// ✅ En comandos / lógica pura
const { user } = useAuthStore.getState()
```

Formato de permisos: `{recurso}:{acción}` — ej: `orders:read`, `menu:write`, `reports:read`

---

## IPC (Electron bridge)

Namespaced: `window.electron.{namespace}.{method}`

| Namespace | Métodos |
|---|---|
| `window` | minimize, maximize, close, onMaximized, onUnmaximized |
| `theme` | get, set, onUpdated |
| `storage` | get, set, delete |

Al agregar un namespace nuevo: `main/ipc/{name}.ts` + `preload/api/{name}.ts` + exponer en `preload/index.ts`

---

## Reglas rápidas

- `any` → nunca. Usar `unknown` + type guard
- `useMemo`/`useCallback` → no (React Compiler)  
- `import React from 'react'` → no. Usar named imports
- Strings hardcodeados en UI → traducir (i18n cuando aplique)
- `localStorage` directo → nunca. Usar `lib/storage/adapter`
- Navegar con `navigate()` si hay comando registrado → usar `commandRegistry.execute()`
