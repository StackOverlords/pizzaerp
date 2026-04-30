Nunca pongas en los commits: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

# MaxPizza — Conventions

---

## API Backend — Convenciones

### Arquitectura

Clean Architecture en 4 capas — nunca saltear capas:

```
domain/        → entidades e interfaces (sin lógica, sin imports de otras capas)
application/   → use cases (lógica de negocio, un archivo por operación)
infrastructure/→ repositorios Prisma (SQL real)
presentation/  → rutas Fastify (HTTP, validación de input, serialización)
```

### Estructura de carpetas

```
apps/api/src/
├── domain/
│   ├── entities/          # interfaces planas de entidad
│   └── repositories/      # interfaces IXRepository + tipos CreateXData/UpdateXData
├── application/
│   └── X/                 # create-X.use-case.ts, list-X.use-case.ts, etc.
├── infrastructure/
│   └── database/
│       ├── repositories/  # PrismaXRepository implements IXRepository
│       └── tenant-schema.service.ts  # DDL de tablas del tenant
├── presentation/
│   └── routes/            # X.ts + __tests__/X.test.ts
└── shared/
    └── errors/app-error.ts  # Errors.notFound / badRequest / conflict / etc.
```

### Entidades

```ts
// ✅ id: string, createdAt: Date siempre presentes
// ✅ Campos opcionales: field: string | null  (nunca undefined)
// ✅ Enums como const object
const ShiftStatus = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const
type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus]

// ❌ Nunca union literal directo
type ShiftStatus = 'OPEN' | 'CLOSED'
```

### Use cases

```ts
// Un archivo por operación: create-X.use-case.ts, list-X.use-case.ts, etc.
// Siempre: función factory que recibe dependencias → devuelve la función ejecutora
export function createCreateXUseCase({ xRepository }: Dependencies) {
  return async function createX(data: CreateXData): Promise<X> {
    // validaciones de negocio acá
    return xRepository.create(data)
  }
}
```

Errores disponibles: `Errors.notFound()` · `Errors.badRequest()` · `Errors.conflict()` · `Errors.unauthorized()` · `Errors.forbidden()`

### Repositorios (SQL)

```ts
// ✅ $queryRawUnsafe con placeholders $1, $2... para datos de usuario
// ✅ Schema interpolado solo en nombre de tabla — viene de la DB, no del usuario
// ✅ Columnas NUMERIC/DECIMAL → Number() en toEntity()
// ✅ INSERT/UPDATE siempre con RETURNING — no hacer segunda query
// ✅ snake_case en DB → camelCase en entidad via toEntity()

async create(data: CreateXData): Promise<X> {
  const rows = await this.db.$queryRawUnsafe<RawX[]>(
    `INSERT INTO "${this.schema}".table (col) VALUES ($1) RETURNING *`,
    data.field,
  )
  return this.toEntity(rows[0])
}
```

### Rutas

```ts
// ✅ preHandler: [authenticate]                        → ADMIN y CASHIER
// ✅ preHandler: [authenticate, authorize([UserRole.ADMIN])]  → solo ADMIN
// ✅ Siempre try/finally con db.$disconnect()
// ✅ POST → reply.code(201).send(result)
// ✅ DELETE → reply.code(204).send()
// ✅ GET/PUT/PATCH → return result  (Fastify serializa con 200)
```

### Tablas nuevas

Agregar el `CREATE TABLE IF NOT EXISTS` en `tenant-schema.service.ts` dentro de `TENANT_DDL_STATEMENTS`. Aplica solo a tenants nuevos — para existentes ejecutar el SQL manualmente.

### Git flow

```
feature/X  →  PR  →  develop  →  PR  →  main  →  CI/CD  →  VPS
```

- Nunca commitear directo a `develop` ni a `main`
- El deploy al VPS se dispara automáticamente con cada push a `main`

---

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
