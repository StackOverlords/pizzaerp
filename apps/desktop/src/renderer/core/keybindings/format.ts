import type { KeyChord, NormalizedKey } from './types'
import { keybindingRegistry } from './keybinding-registry'

export function formatKey(normalized: NormalizedKey): string {
  return normalized.split('+').map((part) => {
    if (part === 'ctrl')  return 'Ctrl'
    if (part === 'shift') return 'Shift'
    if (part === 'alt')   return 'Alt'
    if (part === 'meta')  return '⌘'
    return part.length === 1 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)
  }).join('+')
}

export function formatChord(chord: KeyChord): string {
  return chord.map(formatKey).join(' ')
}

export function getShortcutLabel(commandId: string): string | null {
  const entry = keybindingRegistry.getAll().find((e) => e.commandId === commandId)
  return entry ? formatChord(entry.chord) : null
}
