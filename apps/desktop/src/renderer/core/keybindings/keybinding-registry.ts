import type { NormalizedKey, KeyChord, KeybindingEntry, KeybindingConflict } from './types'
import { KEYBINDING_SOURCE } from './types'

function chordFirstKey(chord: KeyChord): NormalizedKey {
  return chord[0]
}

function chordsEqual(a: KeyChord, b: KeyChord): boolean {
  if (a.length !== b.length) return false
  return a[0] === b[0] && (a.length === 1 || a[1] === b[1])
}

class KeybindingRegistryClass {
  private defaults: Map<NormalizedKey, KeybindingEntry[]> = new Map()
  private overrides: Map<NormalizedKey, KeybindingEntry[]> = new Map()

  registerDefault(entry: KeybindingEntry): void {
    this._insert(this.defaults, entry)
  }

  registerOverride(entry: KeybindingEntry): void {
    this._insert(this.overrides, { ...entry, source: KEYBINDING_SOURCE.USER })
  }

  unregister(firstKey: NormalizedKey, commandId: string): void {
    this._removeFrom(this.defaults, firstKey, commandId)
    this._removeFrom(this.overrides, firstKey, commandId)
  }

  removeUserOverride(firstKey: NormalizedKey, commandId: string): void {
    this._removeFrom(this.overrides, firstKey, commandId)
  }

  resolve(chord: KeyChord): KeybindingEntry | null {
    const firstKey = chordFirstKey(chord)
    return (
      this._findMatch(this.overrides, chord, firstKey) ??
      this._findMatch(this.defaults, chord, firstKey)
    )
  }

  getAll(): KeybindingEntry[] {
    const seen = new Map<string, KeybindingEntry>()
    for (const entries of this.defaults.values()) {
      for (const entry of entries) seen.set(entry.commandId, entry)
    }
    for (const entries of this.overrides.values()) {
      for (const entry of entries) seen.set(entry.commandId, entry)
    }
    return [...seen.values()]
  }

  getConflicts(): KeybindingConflict[] {
    const conflicts: KeybindingConflict[] = []
    this._detectConflicts(this.defaults, conflicts)
    this._detectConflicts(this.overrides, conflicts)
    return conflicts
  }

  private _insert(store: Map<NormalizedKey, KeybindingEntry[]>, entry: KeybindingEntry): void {
    const firstKey = chordFirstKey(entry.chord)
    const existing = store.get(firstKey) ?? []

    const idx = existing.findIndex(
      (e) => e.commandId === entry.commandId && chordsEqual(e.chord, entry.chord)
    )

    if (idx !== -1) {
      existing[idx] = entry
    } else {
      const conflict = existing.find(
        (e) => e.commandId !== entry.commandId && chordsEqual(e.chord, entry.chord)
      )
      if (conflict) {
        console.warn(
          `[KeybindingRegistry] Conflict: "${conflict.commandId}" and "${entry.commandId}" share chord "${entry.chord.join(' ')}"`
        )
      }
      existing.push(entry)
    }

    store.set(firstKey, existing)
  }

  private _removeFrom(
    store: Map<NormalizedKey, KeybindingEntry[]>,
    firstKey: NormalizedKey,
    commandId: string
  ): void {
    const existing = store.get(firstKey)
    if (!existing) return
    const filtered = existing.filter((e) => e.commandId !== commandId)
    if (filtered.length === 0) store.delete(firstKey)
    else store.set(firstKey, filtered)
  }

  private _findMatch(
    store: Map<NormalizedKey, KeybindingEntry[]>,
    chord: KeyChord,
    firstKey: NormalizedKey
  ): KeybindingEntry | null {
    const entries = store.get(firstKey)
    if (!entries || entries.length === 0) return null
    for (let i = entries.length - 1; i >= 0; i--) {
      if (chordsEqual(entries[i].chord, chord)) return entries[i]
    }
    return null
  }

  private _detectConflicts(
    store: Map<NormalizedKey, KeybindingEntry[]>,
    out: KeybindingConflict[]
  ): void {
    for (const entries of store.values()) {
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const a = entries[i]
          const b = entries[j]
          if (a.commandId !== b.commandId && chordsEqual(a.chord, b.chord)) {
            out.push({ chord: a.chord, entries: [a, b] })
          }
        }
      }
    }
  }
}

export const keybindingRegistry = new KeybindingRegistryClass()
