import { create } from 'zustand'
import type { AppConfig } from './schemas'

interface AppConfigStore {
  config:    AppConfig | null
  setConfig: (config: AppConfig) => void
}

export const useAppConfigStore = create<AppConfigStore>()((set) => ({
  config:    null,
  setConfig: (config) => set({ config }),
}))
