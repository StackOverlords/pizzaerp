import { useMemo } from 'react'
import { useKeybindingStore } from '../keybinding-store'
import { getShortcutLabel } from '../format'

export function useCommandShortcut(commandId: string): string | null {
  const overrides = useKeybindingStore((s) => s.overrides)
  return useMemo(() => getShortcutLabel(commandId), [commandId, overrides])
}
