import { create } from 'zustand'
import type { SettingsSection } from './schemas'
import { SETTINGS_SECTION } from './schemas'

interface SettingsStore {
  activeSection: SettingsSection
  setSection: (section: SettingsSection) => void
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  activeSection: SETTINGS_SECTION.GENERAL,
  setSection: (activeSection) => set({ activeSection }),
}))
