import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FONT_SIZE,
  SIDEBAR_ICON_SIZE,
  TABBAR_ICON_SIZE,
  useAppearanceStore,
} from '@/core/appearance/appearance-store'

function SizeSelect({
  value,
  options,
  onChange,
}: {
  value: number
  options: readonly number[]
  onChange: (v: number) => void
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((px) => (
          <SelectItem key={px} value={String(px)}>
            {px}px
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 min-w-0">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

export function AppearanceSection() {
  const { t } = useTranslation()
  const { fontSize, sidebarIconSize, tabbarIconSize, setFontSize, setSidebarIconSize, setTabbarIconSize } =
    useAppearanceStore()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          {t('settings.appearance.title')}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('settings.appearance.description')}
        </p>
      </div>

      <Separator />

      <SettingRow
        label={t('settings.appearance.fontSize.label')}
        description={t('settings.appearance.fontSize.description')}
      >
        <SizeSelect value={fontSize} options={FONT_SIZE.OPTIONS} onChange={setFontSize} />
      </SettingRow>

      <Separator />

      <SettingRow
        label={t('settings.appearance.sidebarIconSize.label')}
        description={t('settings.appearance.sidebarIconSize.description')}
      >
        <SizeSelect value={sidebarIconSize} options={SIDEBAR_ICON_SIZE.OPTIONS} onChange={setSidebarIconSize} />
      </SettingRow>

      <Separator />

      <SettingRow
        label={t('settings.appearance.tabbarIconSize.label')}
        description={t('settings.appearance.tabbarIconSize.description')}
      >
        <SizeSelect value={tabbarIconSize} options={TABBAR_ICON_SIZE.OPTIONS} onChange={setTabbarIconSize} />
      </SettingRow>
    </div>
  )
}
