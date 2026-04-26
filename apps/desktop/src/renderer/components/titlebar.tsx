"use client"

import React, { useEffect, useState } from 'react';
import { Minus, Pizza, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MenubarBarTitle } from '@/components/menu-bar-title';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { storage } from '@/lib/storage/adapter';
import { StorageKeys } from '@/lib/storage/keys';
import { eventBus } from '@/core/events/event-bus';

interface TitleBarProps {
  title?: string;
  className?: string;
}

export function TitleBar({ title = 'Agent', className }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showMenubar, setShowMenubar] = useState(true);

  useEffect(() => {
    storage.get<boolean>(StorageKeys.titlebar.showMenubar).then((val) => {
      if (val !== null) setShowMenubar(val);
    });
    const offMax = window.electron.window.onMaximized(() => setIsMaximized(true));
    const offUnmax = window.electron.window.onUnmaximized(() => setIsMaximized(false));
    const offMenubar = eventBus.on('titlebar.menubar.toggled', ({ visible }) => setShowMenubar(visible));
    return () => { 
      offMax(); 
      offUnmax(); 
      offMenubar(); 
    };
  }, []);

  const toggleMenubar = (checked: boolean) => {
    storage.set(StorageKeys.titlebar.showMenubar, checked);
    eventBus.emit('titlebar.menubar.toggled', { visible: checked });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={cn(
          'relative flex h-9 w-full shrink-0 items-center justify-between bg-background border-b border-border select-none',
          className
        )}
      >
        <div className="absolute inset-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

        <div
          className="relative flex h-full items-center"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* <span className="px-3 text-sm font-semibold text-foreground/70">{title}</span> */}
          <span className="px-3 text-sm font-semibold text-foreground/70"><Pizza size={16} /></span>
          {showMenubar && <MenubarBarTitle />}
        </div>

        <div
          className="relative flex h-full items-center"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Button onClick={() => window.electron.window.minimize()} variant="ghost" size="icon">
            <Minus size={14} />
          </Button>
          <Button onClick={() => window.electron.window.maximize()} variant="ghost" size="icon">
            <Square size={12} />
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
        <ContextMenuCheckboxItem
          checked={showMenubar}
          onCheckedChange={toggleMenubar}
        >
          Show Menu Bar
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
