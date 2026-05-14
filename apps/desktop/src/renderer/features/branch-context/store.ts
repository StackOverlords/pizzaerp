import { create } from 'zustand'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'
import { eventBus } from '@/core/events/event-bus'

interface BranchContextState {
  selectedBranchId: string | null
  _hasHydrated: boolean
  setSelectedBranchId: (id: string, name: string) => void
  clearSelectedBranchId: (reason?: 'user' | 'stale') => void
}

export const useBranchContextStore = create<BranchContextState>()((set) => ({
  selectedBranchId: null,
  _hasHydrated: false,

  setSelectedBranchId: (id, name) => {
    set({ selectedBranchId: id })
    void storage.set(StorageKeys.branch.selectedId, id)
    eventBus.emit('branchContext.branch.selected', { branchId: id, name })
  },

  clearSelectedBranchId: (reason = 'user') => {
    set({ selectedBranchId: null })
    void storage.delete(StorageKeys.branch.selectedId)
    eventBus.emit('branchContext.branch.cleared', { reason })
  },
}))

;(async () => {
  const saved = await storage.get<string>(StorageKeys.branch.selectedId)
  useBranchContextStore.setState({ selectedBranchId: saved ?? null, _hasHydrated: true })
})()
