export type NormalizedKey = string & { readonly __brand: 'NormalizedKey' }
export type KeyChord = [NormalizedKey] | [NormalizedKey, NormalizedKey]

export const KEYBINDING_SOURCE = {
  BUILTIN: 'builtin',
  USER: 'user',
} as const
export type KeybindingSource = (typeof KEYBINDING_SOURCE)[keyof typeof KEYBINDING_SOURCE]

export interface KeybindingEntry {
  commandId: string
  chord: KeyChord
  source: KeybindingSource
  allowInInput?: boolean
}

export interface KeybindingConflict {
  chord: KeyChord
  entries: [KeybindingEntry, KeybindingEntry]
}
