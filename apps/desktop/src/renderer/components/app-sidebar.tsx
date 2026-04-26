import { useEffect } from 'react'
import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { commandRegistry } from '@/core/commands/command-registry'

export function AppSidebar() {
  const { t } = useTranslation()
  const { toggleSidebar } = useSidebar()

  useEffect(() => {
    commandRegistry.override('workbench.action.toggleSidebar', toggleSidebar)
  }, [toggleSidebar])

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => commandRegistry.execute('settings.action.open')}
        >
          <Settings size={15} />
          <span>{t('sidebar.settings')}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
