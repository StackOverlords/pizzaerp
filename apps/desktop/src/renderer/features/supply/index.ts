import i18next from 'i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { openRoute } from '@/core/tabs/open-route'
import { eventBus } from '@/core/events/event-bus'

export function registerSupplyCommands() {
  commandRegistry.register(
    'supply.action.viewTypes',
    () => i18next.t('commands.supply.viewTypes', 'Tipos de insumo'),
    () => {
      openRoute('supply.types')
    },
  )

  commandRegistry.register(
    'supply.action.viewTransfers',
    () => i18next.t('commands.supply.viewTransfers', 'Transferencias de insumos'),
    () => {
      openRoute('supply.transfers')
    },
  )

  commandRegistry.register(
    'supply.action.viewWastages',
    () => i18next.t('commands.supply.viewWastages', 'Mermas'),
    () => {
      openRoute('supply.wastages')
    },
  )

  commandRegistry.register(
    'supply.action.viewClosings',
    () => i18next.t('commands.supply.viewClosings', 'Cierre diario'),
    () => {
      openRoute('supply.closings')
    },
  )

  commandRegistry.register(
    'supply.action.logWastage',
    () => i18next.t('commands.supply.logWastage', 'Registrar merma'),
    () => {
      eventBus.emit('supply.wastageDialog.requested', undefined)
    },
  )
}
