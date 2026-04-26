import i18next from 'i18next'
import { commandRegistry } from './command-registry'
import { useCommandPaletteStore } from './command-palette-store'
import { notify } from '@/core/notify'
import { confirm } from '@/core/confirm'
import { prompt } from '@/core/prompt'

export function registerDefaultCommands() {
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
