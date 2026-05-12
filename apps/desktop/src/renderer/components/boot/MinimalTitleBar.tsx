import type { CSSProperties } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DRAG_STYLE    = { WebkitAppRegion: 'drag' }    as CSSProperties
const NO_DRAG_STYLE = { WebkitAppRegion: 'no-drag' } as CSSProperties

export function MinimalTitleBar() {
  return (
    <div
      style={DRAG_STYLE}
      className="flex h-9 w-full shrink-0 items-center justify-end bg-background border-b border-border select-none cursor-default"
    >
      <div className="flex h-full shrink-0 items-center" style={NO_DRAG_STYLE}>
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
    </div>
  )
}
