import { create } from 'zustand'
import { keybindingRegistry } from './keybinding-registry'
import { KEYBINDING_SOURCE } from './types'
import type { KeybindingEntry, NormalizedKey } from './types'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'

interface KeybindingStore {
  overrides: KeybindingEntry[]
  addOverride: (entry: KeybindingEntry) => void
  removeOverride: (firstKey: NormalizedKey, commandId: string) => void
  resetAll: () => void
  hydrateRegistry: () => Promise<void>
}

export const useKeybindingStore = create<KeybindingStore>()((set, get) => ({
  overrides: [],

  addOverride: (entry) => {
    const override: KeybindingEntry = { ...entry, source: KEYBINDING_SOURCE.USER }
    const next = [...get().overrides, override]
    set({ overrides: next })
    keybindingRegistry.registerOverride(override)
    void storage.set(StorageKeys.keybindings, next)
  },

  removeOverride: (firstKey, commandId) => {
    const next = get().overrides.filter((e) => e.commandId !== commandId)
    set({ overrides: next })
    keybindingRegistry.removeUserOverride(firstKey, commandId)
    void storage.set(StorageKeys.keybindings, next)
  },

  resetAll: () => {
    for (const entry of get().overrides) {
      keybindingRegistry.removeUserOverride(entry.chord[0], entry.commandId)
    }
    set({ overrides: [] })
    void storage.delete(StorageKeys.keybindings)
  },

  hydrateRegistry: async () => {
    const saved = await storage.get<KeybindingEntry[]>(StorageKeys.keybindings)
    if (!saved || saved.length === 0) return
    set({ overrides: saved })
    for (const entry of saved) keybindingRegistry.registerOverride(entry)
  },
}))
