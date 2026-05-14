import i18next from 'i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'
import { useBranchContextStore } from './store'

export function registerBranchContextCommands() {
  commandRegistry.register(
    'branchContext.action.selectBranch',
    () => i18next.t('commands.branchContext.selectBranch', 'Sucursal: Seleccionar sucursal'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      eventBus.emit('branchContext.selector.focusRequested', undefined)
    },
  )

  commandRegistry.register(
    'branchContext.action.clearBranch',
    () => i18next.t('commands.branchContext.clearBranch', 'Sucursal: Limpiar sucursal activa'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      useBranchContextStore.getState().clearSelectedBranchId('user')
    },
  )
}
