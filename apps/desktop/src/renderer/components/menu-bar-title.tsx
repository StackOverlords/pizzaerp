import { useTranslation } from 'react-i18next'
import { commandRegistry } from '@/core/commands/command-registry'
import { useCommandShortcut } from '@/core/keybindings'
import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { THEME_SOURCE } from '@/features/settings/schemas'
import { SUPPORTED_LANGUAGES } from '@/core/i18n'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'

export function MenubarBarTitle() {
  const { t, i18n } = useTranslation()
  const { setTheme } = useTheme()
  const settingsShortcut = useCommandShortcut('settings.action.open')

  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang)
    await storage.set(StorageKeys.language, lang)
  }

  return (
    <Menubar className="border-0 bg-transparent rounded-none p-0 h-full gap-0 shadow-none">
      <MenubarMenu>
        <MenubarTrigger>App</MenubarTrigger>
        <MenubarContent className="min-w-48">
          <MenubarGroup>
            <MenubarItem onClick={() => commandRegistry.execute('settings.action.open')}>
              {t('sidebar.settings')}
              {settingsShortcut && <MenubarShortcut>{settingsShortcut}</MenubarShortcut>}
            </MenubarItem>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarSub>
              <MenubarSubTrigger>{t('settings.general.language.label')}</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onClick={() => handleLanguageChange(SUPPORTED_LANGUAGES.ES)}>
                  {t('settings.general.language.es')}
                  {i18n.language === SUPPORTED_LANGUAGES.ES && (
                    <MenubarShortcut><Check size={14} /></MenubarShortcut>
                  )}
                </MenubarItem>
                <MenubarItem onClick={() => handleLanguageChange(SUPPORTED_LANGUAGES.EN)}>
                  {t('settings.general.language.en')}
                  {i18n.language === SUPPORTED_LANGUAGES.EN && (
                    <MenubarShortcut><Check size={14} /></MenubarShortcut>
                  )}
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarItem onClick={() => window.electron.window.close()}>
              {t('app.quit')}
            </MenubarItem>
          </MenubarGroup>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>{t('menu.view')}</MenubarTrigger>
        <MenubarContent className="w-44">
          <MenubarGroup>
            <MenubarItem onClick={() => commandRegistry.execute('settings.action.goGeneral')}>
              {t('settings.sections.general')}
            </MenubarItem>
            <MenubarItem onClick={() => commandRegistry.execute('settings.action.goAccount')}>
              {t('settings.sections.account')}
            </MenubarItem>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarSub>
              <MenubarSubTrigger>
                {t('settings.general.appearance.title')}
              </MenubarSubTrigger>
              <MenubarSubContent className="w-24">
                <MenubarGroup>
                  <MenubarItem onClick={() => setTheme(THEME_SOURCE.LIGHT)}>
                    {t('settings.general.theme.light')} <MenubarShortcut><Sun size={14} /></MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem onClick={() => setTheme(THEME_SOURCE.DARK)}>
                    {t('settings.general.theme.dark')} <MenubarShortcut><Moon size={14} /></MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem onClick={() => setTheme(THEME_SOURCE.SYSTEM)}>
                    {t('settings.general.theme.system')} <MenubarShortcut><Monitor size={14} /></MenubarShortcut>
                  </MenubarItem>
                </MenubarGroup>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}
