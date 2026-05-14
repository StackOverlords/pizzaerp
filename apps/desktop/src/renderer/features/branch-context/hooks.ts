import { useAuthStore } from '@/core/auth/store'
import { useBranchContextStore } from './store'

export function useEffectiveBranchId(): string | null {
  const userBranchId = useAuthStore((s) => s.user?.branchId ?? null)
  const selectedBranchId = useBranchContextStore((s) => s.selectedBranchId)
  return userBranchId ?? selectedBranchId ?? null
}
