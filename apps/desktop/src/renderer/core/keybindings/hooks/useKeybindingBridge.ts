import { useEffect } from 'react'
import { keybindingService } from '../keybinding-service'
import { useKeybindingStore } from '../keybinding-store'

let _mounted = false

export function useKeybindingBridge(): void {
  useEffect(() => {
    if (_mounted) return
    _mounted = true

    keybindingService.initialize()
    void useKeybindingStore.getState().hydrateRegistry()

    return () => {
      _mounted = false
      keybindingService.dispose()
    }
  }, [])
}
