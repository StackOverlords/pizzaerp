import i18next from 'i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { openRoute } from '@/core/tabs/open-route'
import { useAuthStore } from '@/core/auth/store'

export function registerOrderCommands() {
  commandRegistry.register(
    'orders.action.viewList',
    () => i18next.t('commands.orders.viewList'),
    () => {
      if (!useAuthStore.getState().isAuthenticated) return
      openRoute('orders.list')
    },
  )

  commandRegistry.register(
    'orders.action.create',
    () => i18next.t('commands.orders.create'),
    () => {
      if (!useAuthStore.getState().isAuthenticated) return
      openRoute('orders.new')
    },
  )
}
