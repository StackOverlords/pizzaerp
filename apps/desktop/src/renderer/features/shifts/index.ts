import i18next from 'i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { openRoute } from '@/core/tabs/open-route'
import { eventBus } from '@/core/events/event-bus'
import { notify } from '@/core/notify'
import { useAuthStore } from '@/core/auth/store'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/core/http/query-keys'
import { SHIFT_STATUS, type Shift } from './schemas'

export function registerShiftCommands() {
  commandRegistry.register(
    'shifts.action.openShift',
    () => i18next.t('commands.shifts.openShift'),
    () => {
      if (!useAuthStore.getState().isAuthenticated) return
      const current = queryClient.getQueryData<Shift | null>(queryKeys.shifts.current())
      if (current?.status === SHIFT_STATUS.OPEN) {
        notify(i18next.t('shifts.alreadyOpen'), { type: 'info' })
        return
      }
      eventBus.emit('shifts.openDialog.requested', undefined)
    },
  )

  commandRegistry.register(
    'shifts.action.closeShift',
    () => i18next.t('commands.shifts.closeShift'),
    () => {
      if (!useAuthStore.getState().isAuthenticated) return
      const current = queryClient.getQueryData<Shift | null>(queryKeys.shifts.current())
      if (current?.status !== SHIFT_STATUS.OPEN) {
        notify(i18next.t('shifts.noOpenShift'), { type: 'info' })
        return
      }
      eventBus.emit('shifts.closeDialog.requested', undefined)
    },
  )

  commandRegistry.register(
    'shifts.action.viewCurrent',
    () => i18next.t('commands.shifts.viewCurrent'),
    () => {
      openRoute('shifts.current')
    },
  )

  commandRegistry.register(
    'shifts.action.viewHistory',
    () => i18next.t('commands.shifts.viewHistory'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) {
        notify(i18next.t('shifts.adminOnly'), { type: 'error' })
        return
      }
      openRoute('shifts.history')
    },
  )
}
