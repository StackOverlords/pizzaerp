import { keybindingRegistry } from './keybinding-registry'
import { keyNormalizer } from './key-normalizer'
import { KEYBINDING_SOURCE } from './types'

const BUILTIN_KEYBINDINGS = [
  { key: 'ctrl+,',       commandId: 'settings.action.open' },
  { key: 'ctrl+shift+p', commandId: 'workbench.action.showCommands' },
  { key: 'ctrl+b',       commandId: 'workbench.action.toggleSidebar' },
] as const

export function registerDefaultKeybindings(): void {
  for (const binding of BUILTIN_KEYBINDINGS) {
    keybindingRegistry.registerDefault({
      commandId: binding.commandId,
      chord: keyNormalizer.normalizeChord(binding.key),
      source: KEYBINDING_SOURCE.BUILTIN,
    })
  }
}
