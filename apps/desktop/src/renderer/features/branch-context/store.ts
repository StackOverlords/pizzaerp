import { create } from 'zustand'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'
import { eventBus } from '@/core/events/event-bus'

interface BranchContextState {
  selectedBranchId: string | null
  selectedBranchName: string | null
  _hasHydrated: boolean
  setSelectedBranchId: (id: string, name: string) => void
  clearSelectedBranchId: (reason?: 'user' | 'stale') => void
}

export const useBranchContextStore = create<BranchContextState>()((set) => ({
  selectedBranchId: null,
  selectedBranchName: null,
  _hasHydrated: false,

  setSelectedBranchId: (id, name) => {
    set({ selectedBranchId: id, selectedBranchName: name })
    void storage.set(StorageKeys.branch.selectedId, id)
    void storage.set(StorageKeys.branch.selectedName, name)
    eventBus.emit('branchContext.branch.selected', { branchId: id, name })
  },

  clearSelectedBranchId: (reason = 'user') => {
    set({ selectedBranchId: null, selectedBranchName: null })
    void storage.delete(StorageKeys.branch.selectedId)
    void storage.delete(StorageKeys.branch.selectedName)
    eventBus.emit('branchContext.branch.cleared', { reason })
  },
}))

;(async () => {
  const [savedId, savedName] = await Promise.all([
    storage.get<string>(StorageKeys.branch.selectedId),
    storage.get<string>(StorageKeys.branch.selectedName),
  ])
  useBranchContextStore.setState({
    selectedBranchId: savedId ?? null,
    selectedBranchName: savedName ?? null,
    _hasHydrated: true,
  })
})()
