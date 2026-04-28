import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'
import { eventBus } from '@/core/events/event-bus'
import { SUPPORTED_LANGUAGES } from '@/core/i18n'
import { THEME_SOURCE } from '../../schemas'
import type { ThemeSource } from '../../schemas'

export function GeneralSection() {
  const { t, i18n } = useTranslation()
  const { source, setTheme } = useTheme()
  const [showMenubar, setShowMenubar] = useState(true)
  const [showTabbar, setShowTabbar]   = useState(true)

  useEffect(() => {
    storage.get<boolean>(StorageKeys.titlebar.showMenubar).then((val) => {
      if (val !== null) setShowMenubar(val)
    })
    storage.get<boolean>(StorageKeys.titlebar.showTabbar).then((val) => {
      if (val !== null) setShowTabbar(val)
    })
  }, [])

  const handleMenubarToggle = async (checked: boolean) => {
    setShowMenubar(checked)
    await storage.set(StorageKeys.titlebar.showMenubar, checked)
    eventBus.emit('titlebar.menubar.toggled', { visible: checked })
  }

  const handleTabbarToggle = async (checked: boolean) => {
    setShowTabbar(checked)
    await storage.set(StorageKeys.titlebar.showTabbar, checked)
    eventBus.emit('titlebar.tabbar.toggled', { visible: checked })
  }

  const handleLanguageChange = async (lang: string | null) => {
    if (!lang) return
    await i18n.changeLanguage(lang)
    await storage.set(StorageKeys.language, lang)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground">{t('settings.general.appearance.title')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('settings.general.appearance.description')}
        </p>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>{t('settings.general.theme.label')}</Label>
          <p className="text-xs text-muted-foreground">{t('settings.general.theme.description')}</p>
        </div>
        <ToggleGroup
          value={[source]}
          onValueChange={(v) => v.length > 0 && setTheme(v[0] as ThemeSource)}
        >
          <ToggleGroupItem title={t('settings.general.theme.light')} value={THEME_SOURCE.LIGHT} aria-label="Light">
            <Sun size={14} />
          </ToggleGroupItem>
          <ToggleGroupItem title={t('settings.general.theme.system')} value={THEME_SOURCE.SYSTEM} aria-label="System">
            <Monitor size={14} />
          </ToggleGroupItem>
          <ToggleGroupItem title={t('settings.general.theme.dark')} value={THEME_SOURCE.DARK} aria-label="Dark">
            <Moon size={14} />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="menubar-toggle">{t('settings.general.menubar.label')}</Label>
          <p className="text-xs text-muted-foreground">{t('settings.general.menubar.description')}</p>
        </div>
        <Switch
          id="menubar-toggle"
          checked={showMenubar}
          onCheckedChange={handleMenubarToggle}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="tabbar-toggle">{t('settings.general.tabbar.label')}</Label>
          <p className="text-xs text-muted-foreground">{t('settings.general.tabbar.description')}</p>
        </div>
        <Switch
          id="tabbar-toggle"
          checked={showTabbar}
          onCheckedChange={handleTabbarToggle}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>{t('settings.general.language.label')}</Label>
          <p className="text-xs text-muted-foreground">{t('settings.general.language.description')}</p>
        </div>
        <Select value={i18n.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SUPPORTED_LANGUAGES.ES}>{t('settings.general.language.es')}</SelectItem>
            <SelectItem value={SUPPORTED_LANGUAGES.EN}>{t('settings.general.language.en')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
