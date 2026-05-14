import { useAuthStore } from '@/core/auth/store'
import { useBranchContextStore } from './store'

export function getEffectiveBranchId(): string | null {
  const user = useAuthStore.getState().user
  return user?.branchId ?? useBranchContextStore.getState().selectedBranchId ?? null
}
