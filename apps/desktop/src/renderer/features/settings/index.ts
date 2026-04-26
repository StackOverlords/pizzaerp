import i18next from 'i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { routerRef } from '@/core/routing/router-ref'
import { SETTINGS_SECTION } from './schemas'
import { useSettingsStore } from './store'

export function registerSettingsCommands() {
  commandRegistry.register(
    'settings.action.open',
    () => i18next.t('commands.settings.open'),
    () => routerRef.navigate('/settings')
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
    'settings.action.goKeybindings',
    () => i18next.t('commands.settings.goKeybindings'),
    () => {
      routerRef.navigate('/settings')
      useSettingsStore.getState().setSection(SETTINGS_SECTION.KEYBINDINGS)
    }
  )
}
