import { UserCircle, SlidersHorizontal, Keyboard, Paintbrush, Layout } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '../store'
import { SETTINGS_SECTION, type SettingsSection } from '../schemas'
import { GeneralSection } from './sections/GeneralSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { WorkbenchSection } from './sections/WorkbenchSection'
import { AccountSection } from './sections/AccountSection'
import { KeybindingsSection } from './sections/KeybindingsSection'

const SECTION_MAP: Record<SettingsSection, React.ReactNode> = {
  [SETTINGS_SECTION.GENERAL]:     <GeneralSection />,
  [SETTINGS_SECTION.APPEARANCE]:  <AppearanceSection />,
  [SETTINGS_SECTION.WORKBENCH]:   <WorkbenchSection />,
  [SETTINGS_SECTION.ACCOUNT]:     <AccountSection />,
  [SETTINGS_SECTION.KEYBINDINGS]: <KeybindingsSection />,
}

export function SettingsLayout() {
  const { t } = useTranslation()
  const { activeSection, setSection } = useSettingsStore()

  const navItems = [
    { id: SETTINGS_SECTION.GENERAL,     label: t('settings.sections.general'),     icon: <SlidersHorizontal size={15} /> },
    { id: SETTINGS_SECTION.APPEARANCE,  label: t('settings.sections.appearance'),  icon: <Paintbrush size={15} /> },
    { id: SETTINGS_SECTION.WORKBENCH,   label: t('settings.sections.workbench'),   icon: <Layout size={15} /> },
    { id: SETTINGS_SECTION.ACCOUNT,     label: t('settings.sections.account'),     icon: <UserCircle size={15} /> },
    { id: SETTINGS_SECTION.KEYBINDINGS, label: t('settings.sections.keybindings'), icon: <Keyboard size={15} /> },
  ] as const

  return (
    <div className="flex h-full">
      <aside className="w-48 shrink-0 border-r border-border p-3 space-y-0.5">
        <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('settings.title')}
        </p>
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start gap-2',
              activeSection === item.id && 'bg-accent text-accent-foreground'
            )}
            onClick={() => setSection(item.id)}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </aside>

      <div className="flex-1 overflow-auto p-6 max-w-xl">
        {SECTION_MAP[activeSection]}
      </div>
    </div>
  )
}
