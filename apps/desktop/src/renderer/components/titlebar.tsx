import { useEffect, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { Minus, Pizza, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MenubarBarTitle } from '@/components/menu-bar-title'
import { TabBar } from '@/core/tabs'
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'
import { eventBus } from '@/core/events/event-bus'

// Selectors for elements that are NOT window-drag zones
const INTERACTIVE_SELECTORS =
  'button, a, input, select, textarea, [role="button"], [role="tab"], [role="slider"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="combobox"], [role="listbox"]'

// Electron-specific CSS: makes an element a native window drag region
const DRAG_STYLE    = { WebkitAppRegion: 'drag' }    as CSSProperties
const NO_DRAG_STYLE = { WebkitAppRegion: 'no-drag' } as CSSProperties

interface TitleBarProps {
  title?: string
  className?: string
}

export function TitleBar({ className }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [showMenubar, setShowMenubar] = useState(true)
  const [showTabbar, setShowTabbar] = useState(true)

  useEffect(() => {
    storage.get<boolean>(StorageKeys.titlebar.showMenubar).then((val) => {
      if (val !== null) setShowMenubar(val)
    })
    storage.get<boolean>(StorageKeys.titlebar.showTabbar).then((val) => {
      if (val !== null) setShowTabbar(val)
    })
    const offMax    = window.electron.window.onMaximized(() => setIsMaximized(true))
    const offUnmax  = window.electron.window.onUnmaximized(() => setIsMaximized(false))
    const offMenubar = eventBus.on('titlebar.menubar.toggled', ({ visible }) => setShowMenubar(visible))
    const offTabbar  = eventBus.on('titlebar.tabbar.toggled',  ({ visible }) => setShowTabbar(visible))
    return () => { offMax(); offUnmax(); offMenubar(); offTabbar() }
  }, [])

  const toggleMenubar = (checked: boolean) => {
    storage.set(StorageKeys.titlebar.showMenubar, checked)
    eventBus.emit('titlebar.menubar.toggled', { visible: checked })
  }

  const toggleTabbar = (checked: boolean) => {
    storage.set(StorageKeys.titlebar.showTabbar, checked)
    eventBus.emit('titlebar.tabbar.toggled', { visible: checked })
  }

  // Double-click on draggable area → toggle maximize
  const handleDoubleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest(INTERACTIVE_SELECTORS)) return
    window.electron.window.maximize()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        onDoubleClick={handleDoubleClick}
        style={DRAG_STYLE}
        className={cn(
          'flex h-9 w-full shrink-0 items-center bg-background border-b border-border select-none cursor-default',
          className
        )}
      >
        {/* Left: logo (drag zone) + menu (no-drag) */}
        <div className="flex h-full shrink-0 items-center">
          <span className="px-3 text-sm font-semibold text-foreground/70">
            <Pizza size={16} />
          </span>
          {showMenubar && (
            <div style={NO_DRAG_STYLE}>
              <MenubarBarTitle />
            </div>
          )}
        </div>

        {/* Separator between menu and tabs — only when both are visible */}
        {showMenubar && showTabbar && (
          <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5 self-center" />
        )}

        {/* Center: TabBar — empty space inherits drag, tab buttons override with no-drag */}
        {showTabbar && (
          <div className="flex-1 min-w-0 h-full">
            <TabBar className="h-full" />
          </div>
        )}

        {/* Spacer when tabbar is hidden so controls stay right */}
        {!showTabbar && <div className="flex-1" />}

        {/* Separator between tabs and window controls — only when tabbar is visible */}
        {showTabbar && (
          <div className="w-px h-4 bg-border flex-shrink-0 mx-0.5 self-center" />
        )}

        {/* Right: window controls — no-drag */}
        <div className="flex h-full shrink-0 items-center" style={NO_DRAG_STYLE}>
          <Button onClick={() => window.electron.window.minimize()} variant="ghost" size="icon">
            <Minus size={14} />
          </Button>
          <Button onClick={() => window.electron.window.maximize()} variant="ghost" size="icon">
            <Square size={isMaximized ? 10 : 12} />
          </Button>
          <Button
            onClick={() => window.electron.window.close()}
            variant="ghost"
            size="icon"
            className="hover:bg-destructive hover:text-destructive-foreground"
          >
            <X size={14} />
          </Button>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuCheckboxItem checked={showMenubar} onCheckedChange={toggleMenubar}>
          Show Menu Bar
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked={showTabbar} onCheckedChange={toggleTabbar}>
          Show Tab Bar
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
