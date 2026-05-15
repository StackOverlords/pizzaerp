import i18next from 'i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { openRoute } from '@/core/tabs/open-route'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'

export function registerMenuCommands() {
  commandRegistry.register(
    'menu.action.viewProducts',
    () => i18next.t('commands.menu.viewProducts', 'Productos'),
    () => {
      openRoute('menu.products')
    },
  )

  commandRegistry.register(
    'menu.action.viewCategories',
    () => i18next.t('commands.menu.viewCategories', 'Categorías del menú'),
    () => {
      openRoute('menu.categories')
    },
  )

  commandRegistry.register(
    'menu.action.createDish',
    () => i18next.t('commands.menu.createDish', 'Nuevo plato'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      eventBus.emit('menu.dishDialog.requested', { mode: 'create' })
    },
  )

  commandRegistry.register(
    'menu.action.createCategory',
    () => i18next.t('commands.menu.createCategory', 'Nueva categoría'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      eventBus.emit('menu.categoryDialog.requested', { mode: 'create' })
    },
  )

  commandRegistry.register(
    'menu.action.viewCombos',
    () => i18next.t('commands.menu.viewCombos', 'Combos'),
    () => { openRoute('menu.combos') },
  )

  commandRegistry.register(
    'menu.action.createCombo',
    () => i18next.t('commands.menu.createCombo', 'Nuevo combo'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      eventBus.emit('menu.comboDialog.requested', { mode: 'create' })
    },
  )

  commandRegistry.register(
    'menu.action.viewIngredients',
    () => i18next.t('commands.menu.viewIngredients', 'Ingredientes'),
    () => {
      openRoute('menu.ingredients')
    },
  )

  commandRegistry.register(
    'menu.action.createIngredient',
    () => i18next.t('commands.menu.createIngredient', 'Nuevo ingrediente'),
    () => {
      if (!useAuthStore.getState().hasRole('ADMIN')) return
      eventBus.emit('menu.ingredientDialog.requested', { mode: 'create' })
    },
  )
}
