import { useEffect, useState } from 'react'
import { ChevronRight, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { commandRegistry } from '@/core/commands/command-registry'
import { routes } from '@/config/routes'
import { openRoute } from '@/core/tabs'
import { useActiveRoute } from '@/core/routing/use-active-route'
import { SIDEBAR_ICON_THRESHOLD, useSidebarWidthStore } from '@/core/sidebar/use-sidebar-resize'
import { useAppearanceStore } from '@/core/appearance/appearance-store'
import type { RouteConfig } from '@/core/routing/types'

const navRoutes = routes
  .filter((r) => r.showInSidebar !== false)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

// ─── Full mode ───────────────────────────────────────────────────────────────

function TabDot() {
  return <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
}

function NavItem({ route }: { route: RouteConfig }) {
  const { isRouteActive, isChildActive, isRouteOpen, isRouteTabActive } = useActiveRoute()
  const iconSize = useAppearanceStore((s) => s.sidebarIconSize)

  const hasChildren = (route.children ?? []).length > 0
  const active = isRouteActive(route)
  const childActive = hasChildren && isChildActive(route)
  const [expanded, setExpanded] = useState(childActive)
  const Icon = route.icon

  useEffect(() => {
    if (childActive) setExpanded(true)
  }, [childActive])

  if (hasChildren) {
    const children = (route.children ?? [])
      .filter((c) => c.showInSidebar !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={active || childActive}
          onClick={() => setExpanded((v) => !v)}
        >
          {Icon && <Icon style={{ width: iconSize, height: iconSize }} />}
          <span>{route.label}</span>
          <ChevronRight
            style={{ width: 14, height: 14, transform: expanded ? 'rotate(90deg)' : undefined }}
            className="ml-auto shrink-0 transition-transform duration-200"
          />
        </SidebarMenuButton>
        {expanded && (
          <SidebarMenuSub>
            {children.map((child) => {
              const ChildIcon = child.icon
              const childIsActive = isRouteActive(child)
              const childIsOpen = isRouteOpen(child.id)
              const childIsTabActive = isRouteTabActive(child.id)
              return (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton
                    isActive={childIsActive}
                    onClick={() => openRoute(child.id)}
                  >
                    {ChildIcon && <ChildIcon style={{ width: Math.max(12, iconSize - 2), height: Math.max(12, iconSize - 2) }} />}
                    <span>{child.label}</span>
                    {childIsOpen && !childIsTabActive && <TabDot />}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    )
  }

  const isOpen = isRouteOpen(route.id)
  const isTabActive = isRouteTabActive(route.id)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} onClick={() => openRoute(route.id)}>
        {Icon && <Icon style={{ width: iconSize, height: iconSize }} />}
        <span>{route.label}</span>
        {isOpen && !isTabActive && <TabDot />}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// ─── Icon-only mode ───────────────────────────────────────────────────────────

const iconBtnClass = (active: boolean) =>
  cn(
    'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
    'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
    active && 'bg-sidebar-accent text-sidebar-accent-foreground'
  )

function IconNavItem({ route }: { route: RouteConfig }) {
  const { isRouteActive, isChildActive } = useActiveRoute()
  const iconSize = useAppearanceStore((s) => s.sidebarIconSize)

  const hasChildren = (route.children ?? []).length > 0
  const active = isRouteActive(route)
  const childActive = hasChildren && isChildActive(route)
  const Icon = route.icon

  if (hasChildren) {
    const children = (route.children ?? [])
      .filter((c) => c.showInSidebar !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    return (
      <HoverCard>
        <HoverCardTrigger className={iconBtnClass(active || childActive)}>
          {Icon ? <Icon style={{ width: iconSize, height: iconSize }} /> : null}
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          sideOffset={8}
          alignOffset={-4}
          className="w-44 p-1.5"
        >
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{route.label}</p>
          <div className="flex flex-col gap-0.5">
            {children.map((child) => {
              const ChildIcon = child.icon
              const childIsActive = isRouteActive(child)
              return (
                <button
                  key={child.id}
                  onClick={() => openRoute(child.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    childIsActive && 'bg-accent text-accent-foreground font-medium'
                  )}
                >
                  {ChildIcon && <ChildIcon size={14} className="shrink-0" />}
                  <span>{child.label}</span>
                </button>
              )
            })}
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger className={iconBtnClass(active)} onClick={() => openRoute(route.id)}>
        {Icon ? <Icon style={{ width: iconSize, height: iconSize }} /> : null}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {route.label}
      </TooltipContent>
    </Tooltip>
  )
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { t } = useTranslation()
  const width = useSidebarWidthStore((s) => s.width)
  const toggle = useSidebarWidthStore((s) => s.toggle)
  const iconOnly = width < SIDEBAR_ICON_THRESHOLD

  useEffect(() => {
    commandRegistry.override('workbench.action.toggleSidebar', toggle)
  }, [toggle])

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        {iconOnly ? (
          <TooltipProvider delay={400}>
            <nav className="flex flex-col items-center gap-0.5 p-1.5 pt-2">
              {navRoutes.map((route) => (
                <IconNavItem key={route.id} route={route} />
              ))}
            </nav>
          </TooltipProvider>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navRoutes.map((route) => (
                  <NavItem key={route.id} route={route} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-2">
        {iconOnly ? (
          <Tooltip>
            <TooltipTrigger
              className={iconBtnClass(false)}
              onClick={() => commandRegistry.execute('settings.action.open')}
            >
              <Settings size={16} />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {t('sidebar.settings')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 overflow-hidden"
            onClick={() => commandRegistry.execute('settings.action.open')}
          >
            <Settings size={15} className="shrink-0" />
            <span className="truncate">{t('sidebar.settings')}</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
