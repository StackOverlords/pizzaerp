import { memo } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { Pin, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import { RouteRegistry } from '@/core/routing/route-registry'
import { useAppearanceStore } from '@/core/appearance/appearance-store'
import type { TabInstance } from '../types'

interface TabProps {
  tab: TabInstance
  isActive: boolean
  isLastTab: boolean
  onTabClick: (tab: TabInstance) => void
  onCloseTab: (e: React.MouseEvent, tabId: string) => void
  onCloseOthers: (tabId: string) => void
  onCloseAll: () => void
  onCloseToRight: (tabId: string) => void
  onPin: (tabId: string) => void
  onUnpin: (tabId: string) => void
}

const Tab = memo(({
  tab,
  isActive,
  isLastTab,
  onTabClick,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
  onCloseToRight,
  onPin,
  onUnpin,
}: TabProps) => {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id })
  const Icon = tab.icon ?? RouteRegistry.getRoute(tab.routeId)?.icon
  const iconSize = useAppearanceStore((s) => s.tabbarIconSize)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1 && tab.isClosable && !tab.isPinned) {
      e.preventDefault()
      onCloseTab(e, tab.id)
    }
  }

  const tabButton = (
    <Button
      variant="ghost"
      onClick={() => onTabClick(tab)}
      onMouseDown={handleMiddleClick}
      {...attributes}
      {...listeners}
      title={tab.title}
      className={cn(
        'group relative flex items-center gap-1.5 text-xs transition-all select-none',
        'cursor-grab active:cursor-grabbing rounded-md',
        isDragging && 'opacity-40',
        tab.isPinned
          ? 'size-7 justify-center px-0'
          : 'h-7 min-w-[80px] max-w-[160px] px-2.5',
        isActive
          ? 'bg-accent text-foreground font-medium hover:bg-accent'
          : 'font-normal text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
      {tab.isPinned ? (
        <span className="flex items-center justify-center">
          {Icon
            ? <Icon style={{ width: iconSize, height: iconSize }} className="flex-shrink-0" />
            : <Pin style={{ width: iconSize, height: iconSize }} className="flex-shrink-0 rotate-45" />}
        </span>
      ) : (
        <>
          {Icon && <Icon style={{ width: iconSize, height: iconSize }} className="flex-shrink-0 shrink-0" />}
          <span className="truncate flex-1 text-left">{tab.title}</span>
          {tab.isClosable && !isLastTab && (
            <span
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCloseTab(e, tab.id) }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                'flex-shrink-0 flex items-center justify-center rounded-sm size-4 transition-all cursor-pointer',
                'opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-foreground/10',
                isActive && 'opacity-40'
              )}
              aria-label={t('tabs.closeTab')}
            >
              <X className="size-2.5" />
            </span>
          )}
        </>
      )}
    </Button>
  )

  return (
    <div ref={setNodeRef} style={{ ...style, WebkitAppRegion: 'no-drag' } as CSSProperties}>
      <ContextMenu>
        <ContextMenuTrigger>{tabButton}</ContextMenuTrigger>
        <ContextMenuContent>
          {tab.isPinned ? (
            <ContextMenuItem onClick={() => onUnpin(tab.id)}>{t('tabs.unpinTab')}</ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={() => onPin(tab.id)}>{t('tabs.pinTab')}</ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onCloseOthers(tab.id)}>{t('tabs.closeOthers')}</ContextMenuItem>
          <ContextMenuItem onClick={() => onCloseToRight(tab.id)}>{t('tabs.closeToRight')}</ContextMenuItem>
          {!isLastTab && (
            <ContextMenuItem onClick={() => onCloseAll()}>{t('tabs.closeAll')}</ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
})
Tab.displayName = 'Tab'

export default Tab
