import i18next from 'i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { openRoute } from '@/core/tabs/open-route'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'

export function registerStaffCommands() {
  commandRegistry.register(
    'staff.action.viewUsers',
    () => i18next.t('commands.staff.viewUsers', 'Personal: Usuarios'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      openRoute('staff.users')
    },
  )

  commandRegistry.register(
    'staff.action.viewBranches',
    () => i18next.t('commands.staff.viewBranches', 'Personal: Sucursales'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      openRoute('staff.branches')
    },
  )

  commandRegistry.register(
    'staff.action.createUser',
    () => i18next.t('commands.staff.createUser', 'Personal: Nuevo usuario'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      eventBus.emit('staff.userDialog.requested', { mode: 'create' })
    },
  )

  commandRegistry.register(
    'staff.action.createBranch',
    () => i18next.t('commands.staff.createBranch', 'Personal: Nueva sucursal'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      eventBus.emit('staff.branchDialog.requested', { mode: 'create' })
    },
  )
}
