import i18next from 'i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { openRoute } from '@/core/tabs/open-route'
import { SETTINGS_SECTION } from './schemas'
import { useSettingsStore } from './store'

export function registerSettingsCommands() {
  commandRegistry.register(
    'settings.action.open',
    () => i18next.t('commands.settings.open'),
    () => openRoute('settings')
  )

  commandRegistry.register(
    'settings.action.goGeneral',
    () => i18next.t('commands.settings.goGeneral'),
    () => useSettingsStore.getState().setSection(SETTINGS_SECTION.GENERAL)
  )

  commandRegistry.register(
    'settings.action.goAccount',
    () => i18next.t('commands.settings.goAccount'),
    () => useSettingsStore.getState().setSection(SETTINGS_SECTION.ACCOUNT)
  )

  commandRegistry.register(
    'settings.action.goWorkbench',
    () => i18next.t('commands.settings.goWorkbench'),
    () => {
      openRoute('settings')
      useSettingsStore.getState().setSection(SETTINGS_SECTION.WORKBENCH)
    }
  )

  commandRegistry.register(
    'settings.action.goAppearance',
    () => i18next.t('commands.settings.goAppearance'),
    () => {
      openRoute('settings')
      useSettingsStore.getState().setSection(SETTINGS_SECTION.APPEARANCE)
    }
  )

  commandRegistry.register(
    'settings.action.goKeybindings',
    () => i18next.t('commands.settings.goKeybindings'),
    () => {
      openRoute('settings')
      useSettingsStore.getState().setSection(SETTINGS_SECTION.KEYBINDINGS)
    }
  )
}
