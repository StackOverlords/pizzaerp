import i18next from 'i18next'
import { commandRegistry } from './command-registry'
import { useCommandPaletteStore } from './command-palette-store'
import { notify } from '@/core/notify'
import { confirm } from '@/core/confirm'
import { prompt } from '@/core/prompt'
import { useTabStore, useTabsSettingsStore } from '@/core/tabs/store/tab-store'
import { routerRef } from '@/core/routing/router-ref'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'
import { eventBus } from '@/core/events/event-bus'

export function registerDefaultCommands() {
  // Tab navigation commands
  commandRegistry.register(
    'tabs.action.closeActive',
    () => i18next.t('commands.tabs.closeActive'),
    () => {
      const store = useTabStore.getState()
      const { activeTabId } = store
      if (!activeTabId) return
      const tab = store.tabs.find((t) => t.id === activeTabId)
      if (!tab || !tab.isClosable || tab.isPinned) return
      const { allowCloseLastTab } = useTabsSettingsStore.getState()
      if (store.tabs.length === 1 && !allowCloseLastTab) return
      store.removeTab(activeTabId)
      const { activeTabId: nextId, tabs: nextTabs } = useTabStore.getState()
      if (nextId) {
        const next = nextTabs.find((t) => t.id === nextId)
        if (next) routerRef.navigate(next.path)
      } else {
        routerRef.navigate('/')
      }
    }
  )

  commandRegistry.register(
    'tabs.action.nextTab',
    () => i18next.t('commands.tabs.nextTab'),
    () => {
      const { tabs, activeTabId } = useTabStore.getState()
      if (tabs.length <= 1) return
      const idx = tabs.findIndex((t) => t.id === activeTabId)
      const next = tabs[(idx + 1) % tabs.length]
      useTabStore.getState().setActiveTab(next.id)
      routerRef.navigate(next.path)
    }
  )

  commandRegistry.register(
    'tabs.action.prevTab',
    () => i18next.t('commands.tabs.prevTab'),
    () => {
      const { tabs, activeTabId } = useTabStore.getState()
      if (tabs.length <= 1) return
      const idx = tabs.findIndex((t) => t.id === activeTabId)
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length]
      useTabStore.getState().setActiveTab(prev.id)
      routerRef.navigate(prev.path)
    }
  )

  commandRegistry.register(
    'tabs.action.closeAll',
    () => i18next.t('commands.tabs.closeAll'),
    () => {
      useTabStore.getState().closeAllTabs()
      const { activeTabId, tabs } = useTabStore.getState()
      if (activeTabId) {
        const active = tabs.find((t) => t.id === activeTabId)
        if (active) routerRef.navigate(active.path)
      } else {
        routerRef.navigate('/')
      }
    }
  )

  commandRegistry.register(
    'tabs.action.pinActive',
    () => i18next.t('commands.tabs.pinActive'),
    () => {
      const { activeTabId } = useTabStore.getState()
      if (!activeTabId) return
      useTabStore.getState().pinTab(activeTabId)
    }
  )

  commandRegistry.register(
    'tabs.action.unpinActive',
    () => i18next.t('commands.tabs.unpinActive'),
    () => {
      const { activeTabId } = useTabStore.getState()
      if (!activeTabId) return
      useTabStore.getState().unpinTab(activeTabId)
    }
  )

  commandRegistry.register(
    'workbench.action.toggleMenubar',
    () => i18next.t('commands.workbench.toggleMenubar'),
    async () => {
      const current = await storage.get<boolean>(StorageKeys.titlebar.showMenubar)
      const next = current === false
      await storage.set(StorageKeys.titlebar.showMenubar, next)
      eventBus.emit('titlebar.menubar.toggled', { visible: next })
    }
  )

  commandRegistry.register(
    'workbench.action.toggleTabbar',
    () => i18next.t('commands.workbench.toggleTabbar'),
    async () => {
      const current = await storage.get<boolean>(StorageKeys.titlebar.showTabbar)
      const next = current === false
      await storage.set(StorageKeys.titlebar.showTabbar, next)
      eventBus.emit('titlebar.tabbar.toggled', { visible: next })
    }
  )

  commandRegistry.register(
    'workbench.action.toggleSidebar',
    () => i18next.t('commands.workbench.toggleSidebar'),
    () => { /* handler injected by AppSidebar via commandRegistry.override() */ }
  )

  commandRegistry.register(
    'workbench.action.showCommands',
    () => i18next.t('commands.workbench.showCommands'),
    () => useCommandPaletteStore.getState().open()
  )

  if (import.meta.env.DEV) {
    commandRegistry.register(
      'dev.notify.success',
      () => 'DEV: Notificación éxito',
      () => notify('Orden creada exitosamente', { type: 'success', description: 'Mesa 4 · 3 items' })
    )
    commandRegistry.register(
      'dev.notify.error',
      () => 'DEV: Notificación error',
      () => notify('No se pudo procesar el pago', { type: 'error', description: 'Timeout de conexión' })
    )
    commandRegistry.register(
      'dev.notify.warning',
      () => 'DEV: Notificación warning',
      () => notify('Stock bajo', { type: 'warning', description: 'Quedan 2 unidades de Mozzarella' })
    )
    commandRegistry.register(
      'dev.confirm.default',
      () => 'DEV: Confirmar acción',
      async () => {
        const ok = await confirm({ title: '¿Cerrar mesa?', description: 'Se marcará como pagada y no podrá modificarse.', confirmLabel: 'Cerrar mesa' })
        notify(ok ? 'Mesa cerrada' : 'Cancelado', { type: ok ? 'success' : 'info' })
      }
    )
    commandRegistry.register(
      'dev.confirm.destructive',
      () => 'DEV: Confirmar acción destructiva',
      async () => {
        const ok = await confirm({ title: '¿Eliminar producto?', description: 'Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', variant: 'destructive' })
        notify(ok ? 'Producto eliminado' : 'Cancelado', { type: ok ? 'error' : 'info' })
      }
    )
    commandRegistry.register(
      'dev.prompt.single',
      () => 'DEV: Prompt campo único',
      async () => {
        const result = await prompt({
          title: 'Nombre de la mesa',
          description: 'Ingresá un nombre para identificar la mesa.',
          fields: [{ id: 'name', label: 'Nombre', placeholder: 'Ej: Mesa terraza', required: true }],
          confirmLabel: 'Crear',
        })
        if (result) notify(`Mesa creada: ${result.name}`, { type: 'success' })
      }
    )
    commandRegistry.register(
      'dev.prompt.multi',
      () => 'DEV: Prompt múltiples campos',
      async () => {
        const result = await prompt({
          title: 'Agregar producto',
          fields: [
            { id: 'name', label: 'Nombre', placeholder: 'Ej: Pizza Margherita', required: true },
            { id: 'price', label: 'Precio', type: 'number', placeholder: '0.00', required: true },
            { id: 'password', label: 'Contraseña (opcional)', type: 'password' },
          ],
          confirmLabel: 'Agregar',
        })
        if (result) notify(`${result.name} — $${result.price} — #${result.password || 'Sin contraseña'}`, { type: 'success' })
        else notify('Cancelado', { type: 'info' })
      },
      {
        showInPalette:true
      }
    )
    commandRegistry.register(
      'dev.error.boundary',
      () => 'DEV: Lanzar error (ErrorBoundary)',
      () => { throw new Error('Error de prueba — ErrorBoundary activo') }
    )
  }
}
