import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MAX_OPEN_TABS_OPTIONS, useTabsSettingsStore } from '@/core/tabs'

function SettingRow({
  id,
  label,
  description,
  children,
}: {
  id?: string
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

export function WorkbenchSection() {
  const { t } = useTranslation()
  const {
    allowCloseLastTab,
    restoreTabsOnStartup,
    maxOpenTabs,
    setAllowCloseLastTab,
    setRestoreTabsOnStartup,
    setMaxOpenTabs,
  } = useTabsSettingsStore()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          {t('settings.workbench.title')}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('settings.workbench.description')}
        </p>
      </div>

      <Separator />

      <SettingRow
        id="restore-tabs"
        label={t('settings.workbench.restoreTabs.label')}
        description={t('settings.workbench.restoreTabs.description')}
      >
        <Switch
          id="restore-tabs"
          checked={restoreTabsOnStartup}
          onCheckedChange={setRestoreTabsOnStartup}
        />
      </SettingRow>

      <Separator />

      <SettingRow
        id="close-last-tab"
        label={t('settings.workbench.closeLastTab.label')}
        description={t('settings.workbench.closeLastTab.description')}
      >
        <Switch
          id="close-last-tab"
          checked={allowCloseLastTab}
          onCheckedChange={setAllowCloseLastTab}
        />
      </SettingRow>

      <Separator />

      <SettingRow
        label={t('settings.workbench.maxTabs.label')}
        description={t('settings.workbench.maxTabs.description')}
      >
        <Select
          value={String(maxOpenTabs)}
          onValueChange={(v) => setMaxOpenTabs(Number(v))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MAX_OPEN_TABS_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  )
}
