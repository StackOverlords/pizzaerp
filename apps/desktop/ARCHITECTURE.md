# Arquitectura del proyecto

Electron + React 19 + Vite. El proceso **main** (Node.js) corre en el backend, el proceso **renderer** (React) corre en el frontend. Se comunican exclusivamente via IPC — nunca directamente.

```
┌─────────────────────────────────────────────────┐
│  main process (Node.js)                         │
│  src/main/  ←→  src/preload/  ←→  src/renderer/ │
│  electron         bridge          React app      │
└─────────────────────────────────────────────────┘
```

---

## Proceso Main — `src/main/`

### `index.ts`
Entry point del proceso main. Registra los eventos del ciclo de vida de Electron (`ready`, `window-all-closed`, `activate`). No hace nada más — delega la creación de la ventana a `window.ts`.

### `window.ts`
Crea y configura el `BrowserWindow`. Aquí van las opciones de la ventana (tamaño, frame, etc.), el preload script, y la lógica de carga: en desarrollo carga el dev server de Vite (`MAIN_WINDOW_VITE_DEV_SERVER_URL`), en producción carga el HTML compilado. Tiene retry automático si la primera carga falla.

### `store/index.ts`
Instancia única de `electron-store`. Persiste datos en disco en la carpeta de datos del usuario del sistema operativo. **Todo acceso al store pasa por aquí** — nunca importar `electron-store` directo desde otro archivo.

### `ipc/index.ts`
Registra todos los handlers IPC. Se llama una sola vez en `window.ts` después de crear la ventana. Para agregar un nuevo namespace de IPC: crear `ipc/nombre.ts`, exportar `registerNombreHandlers()`, e importarla aquí.

### `ipc/window.ts`
Handlers para controlar la ventana: `minimize`, `maximize`, `close`, y eventos de vuelta al renderer (`window:maximized`, `window:unmaximized`).

### `ipc/theme.ts`
Handlers para leer y escribir el tema del sistema. Lee el tema nativo de Electron (`nativeTheme`) y escucha cambios del sistema operativo para notificar al renderer.

### `ipc/storage.ts`
Handlers que exponen el `electron-store` al renderer: `storage:get`, `storage:set`, `storage:delete`. El renderer nunca accede al filesystem directamente — todo pasa por estos handlers.

---

## Proceso Preload — `src/preload/`

El preload corre en un contexto especial: tiene acceso a Node.js APIs **y** al DOM. Su único propósito es ser el puente seguro entre main y renderer vía `contextBridge`.

### `index.ts`
Expone `window.electron` al renderer con todos los namespaces. Si agregás un namespace nuevo, lo exponés acá.

### `api/window.ts`
Funciones del namespace `window.electron.window`: `minimize()`, `maximize()`, `close()`, `onMaximized(cb)`, `onUnmaximized(cb)`.

### `api/theme.ts`
Funciones del namespace `window.electron.theme`: `get()`, `set(source)`, `onUpdated(cb)`.

### `api/storage.ts`
Funciones del namespace `window.electron.storage`: `get(key)`, `set(key, value)`, `delete(key)`. El renderer usa estas funciones a través del adapter (`lib/storage/adapter.ts`), no directamente.

---

## Renderer — `src/renderer/`

### `main.tsx`
Bootstrap de la app React. Orden de inicialización:
1. Carga el idioma guardado
2. Registra los comandos (`registerDefaultCommands`, `registerSettingsCommands`, …)
3. Registra los keybindings (`registerDefaultKeybindings`)
4. Renderiza `<App />`

Cuando agregues un nuevo módulo (feature), su `registerXCommands()` va aquí.

### `App.tsx`
Componente raíz. Provee `QueryClientProvider`, `MemoryRouter`, y arma el shell de la app: `TitleBar` arriba, `AppSidebar` a la izquierda, contenido a la derecha. También inicializa el bridge de keybindings (`useKeybindingBridge`).

### `config/routes.tsx`
**Fuente única de verdad de rutas.** El sidebar y el router leen el mismo array `routes`. Para agregar una página nueva: agregar un objeto `RouteConfig` aquí. Campos: `id`, `path`, `label`, `icon`, `element`, `permissions`, `showInSidebar`.

### `index.css`
Estilos globales y variables CSS de Tailwind/shadcn. Variables de tema (colores, radios, etc.) definidas aquí como CSS custom properties.

### `global.d.ts`
Tipos globales del renderer: declara `window.electron` con los tipos de todos los namespaces del bridge.

### `vite-env.d.ts`
Tipos de las variables de entorno de Vite (`import.meta.env`).

---

## Core — `src/renderer/core/`

Infraestructura transversal. No toca lógica de negocio.

### Commands — `core/commands/`

#### `types.ts`
Tipos `CommandHandler` y `CommandEntry`.

#### `command-registry.ts`
Registro central de comandos. Cada acción significativa de la app se registra aquí con un ID único (`feature.action.verboNombre`). Métodos: `register`, `unregister`, `execute`, `override`, `getAll`, `has`. El método `override` reemplaza el handler de un comando ya registrado (útil cuando el handler real vive en un componente que monta después del registro inicial).

#### `default-commands.ts`
Registra los comandos del workbench (no pertenecen a ningún feature): `workbench.action.toggleSidebar`, `workbench.action.showCommands`. Los handlers de workbench que dependen de componentes se completan con `commandRegistry.override()` desde el componente correspondiente.

---

### Keybindings — `core/keybindings/`

Sistema completo de atajos de teclado con soporte para chords de dos teclas (tipo VS Code), overrides de usuario persistidos en disco, y detección de conflictos.

#### `types.ts`
Tipos: `NormalizedKey` (string branded), `KeyChord` (1 o 2 teclas), `KeybindingEntry`, `KeybindingConflict`, `KEYBINDING_SOURCE` (`builtin` | `user`).

#### `key-normalizer.ts`
Convierte `KeyboardEvent` → `NormalizedKey`. Normaliza sinónimos (`ctrl`/`control`, `meta`/`cmd`), ordena los modificadores siempre igual (`ctrl+alt+shift+meta+tecla`), y maneja aliases de teclas (`esc` → `escape`, `return` → `enter`). Usar siempre `keyNormalizer.normalize(event)` — nunca leer `event.key` directo.

#### `chord-buffer.ts`
Buffer de dos teclas para detectar secuencias chord. Usado internamente por `keybinding-service.ts`.

#### `keybinding-registry.ts`
Almacena los keybindings (defaults y overrides de usuario por separado). Resuelve qué comando corresponde a un chord dado (los overrides tienen prioridad sobre los defaults). Detecta conflictos. **No escucha eventos de teclado** — solo es un mapa.

#### `keybinding-service.ts`
Escucha `keydown` en el documento (fase capture, para tener prioridad sobre el DOM) y resuelve el chord contra el registry. Si hay match, ejecuta el comando via `commandRegistry.execute()`. Soporta chords de dos teclas: espera la segunda tecla si hay candidatos parciales.

#### `keybinding-store.ts`
Store Zustand de los overrides del usuario. Persiste en disco via `storage.set(StorageKeys.keybindings)`. Al iniciar la app, `hydrateRegistry()` carga los overrides guardados y los registra en el registry. Métodos: `addOverride`, `removeOverride`, `resetAll`, `hydrateRegistry`.

#### `default-keybindings.ts`
Define los keybindings por defecto de la app. Para agregar un nuevo atajo default: agregar una entrada al array `BUILTIN_KEYBINDINGS`. Formato de chord: `"ctrl+k ctrl+s"` para secuencia de dos teclas.

#### `format.ts`
Utilidades de formato visual: `formatKey(normalized)` → `"Ctrl+Shift+P"`, `formatChord(chord)` → string legible, `getShortcutLabel(commandId)` → shortcut del comando o `null`. Usar siempre estas funciones para mostrar atajos en la UI — nunca formatear a mano.

#### `index.ts`
Barrel de exports del módulo. Importar desde `@/core/keybindings` en vez de desde archivos internos.

#### `hooks/useKeybindingBridge.ts`
Hook que inicializa el `keybindingService` e hidrata los overrides del usuario. Se llama una sola vez en `App.tsx`. Sin este hook los keybindings no funcionan.

#### `hooks/useCommandShortcut.ts`
Hook reactivo: dado un `commandId`, retorna el label del shortcut actual (incluyendo overrides del usuario). Se re-renderiza automáticamente cuando el usuario cambia un atajo. Usar en la UI para mostrar shortcuts de forma dinámica — nunca hardcodear `"Ctrl+,"`.

---

### Auth — `core/auth/`

#### `types.ts`
Tipos: `User`, `AuthState`, permisos.

#### `sdk.ts`
Wrapper sobre `sdk-simple-auth`. Funciones de login, logout, y refresh de token.

#### `store.ts`
Store Zustand del estado de autenticación: usuario actual, token, estado de carga. Es el único lugar donde se guarda el usuario — nunca guardarlo en estado local de componentes.

#### `hooks/use-permissions.ts`
Hook `usePermissions()`. Retorna `{ hasPermission(permission: string): boolean }`. Usar en componentes para mostrar/ocultar UI según permisos. Formato de permiso: `recurso:acción` (ej: `orders:read`).

---

### Events — `core/events/`

#### `event-bus.ts`
Bus de eventos tipado para comunicación desacoplada entre módulos. Define `AppEvents` con todos los eventos de la app. Cuando un módulo necesita reaccionar a algo que ocurre en otro módulo sin importarlo directamente, usa `eventBus.emit` / `eventBus.on`. Para agregar un evento nuevo: extender el tipo `AppEvents`.

---

### HTTP — `core/http/`

#### `client.ts`
Instancia de Axios configurada con base URL, headers de auth, e interceptors. **Toda request HTTP pasa por aquí** — nunca crear una instancia de Axios propia.

#### `query-keys.ts`
Factory de query keys para TanStack Query. **Nunca usar strings sueltos como query keys** — siempre `queryKeys.modulo.operacion(params)`. Agregar aquí las keys de cada módulo nuevo.

---

### i18n — `core/i18n/`

#### `index.ts`
Configura i18next con los idiomas soportados. Exporta `initI18n(lang?)` que se llama en el bootstrap. Exporta `SUPPORTED_LANGUAGES`.

#### `locales/es.json` / `locales/en.json`
Traducciones. Estructura jerárquica por feature. Para textos nuevos: agregar la clave en ambos archivos. Nunca strings hardcodeados visibles al usuario en componentes.

---

### Routing — `core/routing/`

#### `types.ts`
Tipo `RouteConfig`: define la forma de cada ruta en `config/routes.tsx`.

#### `guards.ts`
Guards de navegación que validan permisos antes de renderizar una ruta.

#### `router-ref.ts`
Referencia imperativa al `navigate` de React Router. Permite navegar desde fuera de componentes (por ejemplo, desde un comando registrado en `commandRegistry`). Se inicializa en `App.tsx` via `RouterBinder`.

---

## Lib — `src/renderer/lib/`

### `utils.ts`
Función `cn(...classes)` — combina `clsx` y `tailwind-merge`. Usar siempre para combinar clases de Tailwind condicionalmente.

### `query-client.ts`
Instancia de `QueryClient` de TanStack Query con configuración global (stale time, retry, etc.).

### `storage/adapter.ts`
Adapter que envuelve `window.electron.storage` con una interfaz más limpia. **Todo acceso a datos persistidos del renderer pasa por aquí** — nunca llamar `window.electron.storage` directamente.

### `storage/keys.ts`
Constantes de las keys de storage. Para agregar una key nueva: agregarla aquí. Nunca usar strings sueltos como keys de storage.

---

## Components — `src/renderer/components/`

### `ui/`
Primitivos de shadcn/ui generados. **No modificar** (excepto casos muy justificados como remover listeners conflictivos). Si necesitás un componente que no existe, agregarlo con `pnpm dlx shadcn@latest add nombre`.

### `titlebar.tsx`
Barra de título personalizada (frameless window). Contiene el `MenubarBarTitle` y los botones de ventana (minimizar, maximizar, cerrar). Escucha eventos IPC de maximización para actualizar el ícono.

### `app-sidebar.tsx`
Sidebar de la aplicación. Al montar, inyecta el handler real de `workbench.action.toggleSidebar` en el `commandRegistry` via `commandRegistry.override()`. Itera `routes` para generar los items de navegación.

### `menu-bar-title.tsx`
Menú tipo macOS en el titlebar. Los shortcuts que muestra los lee dinámicamente de `useCommandShortcut()` — nunca hardcodear strings de atajos aquí.

---

## Features — `src/renderer/features/`

Cada feature es un módulo autocontenido. Estructura estándar:

```
features/nombre/
├── index.ts        ← registra comandos del módulo
├── schemas.ts      ← tipos Zod + constantes
├── store.ts        ← Zustand (solo si hay estado local)
├── api.ts          ← hooks TanStack Query
└── components/
    └── NombreLayout.tsx
```

### Settings — `features/settings/`

#### `schemas.ts`
Tipos y constantes del módulo: `THEME_SOURCE`, `SETTINGS_SECTION` (enum de secciones), `generalSettingsSchema`. Para agregar una sección nueva: agregar una entrada a `SETTINGS_SECTION`.

#### `store.ts`
Zustand store de UI de settings: sección activa (`activeSection`), `setSection()`. No persiste en disco — es estado de navegación interna.

#### `index.ts`
Registra los comandos del módulo: `settings.action.open`, `settings.action.goGeneral`, `settings.action.goAccount`, `settings.action.goKeybindings`. Para agregar una sección nueva: agregar su comando aquí.

#### `components/SettingsLayout.tsx`
Layout de la página de settings: sidebar de navegación izquierdo + contenido derecho. El `SECTION_MAP` mapea cada `SETTINGS_SECTION` a su componente. Para agregar una sección: agregarla a `navItems` y a `SECTION_MAP`.

#### `components/sections/GeneralSection.tsx`
Sección de apariencia: selector de tema, toggle de menubar, selector de idioma.

#### `components/sections/AccountSection.tsx`
Sección de cuenta: info del usuario autenticado y botón de logout.

#### `components/sections/KeybindingsSection.tsx`
Sección de atajos de teclado. Lista todos los comandos registrados con sus atajos actuales. Click en un atajo → modo captura (escucha el próximo keydown). Soporta override por comando y reset individual o total. Los cambios se persisten en disco via `keybinding-store`.

---

## Pages — `src/renderer/pages/`

### `settings.tsx`
Página que renderiza `<SettingsLayout />`. Lazy-loaded desde `config/routes.tsx`.

---

## Hooks globales — `src/renderer/hooks/`

### `useTheme.ts`
Lee y escribe el tema (light/dark/system) via IPC. Suscribe al evento `theme:updated` del main process para sincronizar cuando el SO cambia el tema.

### `use-mobile.ts`
Hook que retorna `true` si el viewport es mobile (< 768px). Generado por shadcn.

---

## Archivos de configuración raíz

| Archivo | Para qué |
|---|---|
| `forge.config.ts` | Configuración de Electron Forge: makers (deb, rpm, zip), plugins (Vite, Fuses) |
| `vite.main.config.ts` | Config de Vite para el proceso main (output CJS) |
| `vite.preload.config.ts` | Config de Vite para el preload (output CJS) |
| `vite.renderer.config.ts` | Config de Vite para el renderer (React + Tailwind, alias `@/`) |
| `tsconfig.json` | TypeScript strict, `moduleResolution: bundler`, paths `@/*` |
| `.npmrc` | `node-linker=hoisted` — requerido por Electron Forge con pnpm |
| `forge.env.d.ts` | Declara los globals de Forge (`MAIN_WINDOW_VITE_DEV_SERVER_URL`, etc.) |
| `.eslintrc.json` | ESLint con TypeScript y reglas de imports |
| `index.html` | HTML base del renderer. Incluye CSP meta tag para dev. |
