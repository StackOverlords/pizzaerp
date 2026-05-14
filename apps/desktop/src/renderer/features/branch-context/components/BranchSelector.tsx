import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useAuthStore } from '@/core/auth/store'
import { useBranches } from '@/features/staff/api'
import { useBranchContextStore } from '../store'

export function BranchSelector() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { data: branches } = useBranches()
  const selectedBranchId = useBranchContextStore((s) => s.selectedBranchId)
  const selectedBranchName = useBranchContextStore((s) => s.selectedBranchName)
  const setSelectedBranchId = useBranchContextStore((s) => s.setSelectedBranchId)
  const clearSelectedBranchId = useBranchContextStore((s) => s.clearSelectedBranchId)

  // Stale-id guard: if saved branch no longer exists in the list, clear it
  useEffect(() => {
    if (selectedBranchId && branches && branches.length > 0) {
      const exists = branches.some((b) => b.id === selectedBranchId)
      if (!exists) clearSelectedBranchId('stale')
    }
  }, [branches, selectedBranchId, clearSelectedBranchId])

  if (!user || user.branchId !== null) return null

  const handleChange = (value: string | null) => {
    if (!value) return
    const branch = branches?.find((b) => b.id === value)
    if (branch) setSelectedBranchId(branch.id, branch.name)
  }

  const displayName = selectedBranchName ?? (
    selectedBranchId
      ? branches?.find((b) => b.id === selectedBranchId)?.name ?? selectedBranchId
      : null
  )

  return (
    <div className="ml-auto flex items-center gap-1.5">
      <Building2 size={14} className="text-muted-foreground shrink-0" />
      <Select value={selectedBranchId ?? ''} onValueChange={handleChange}>
        <SelectTrigger className="h-7 w-44 text-xs">
          <span className="truncate text-left flex-1 min-w-0">
            {displayName ?? (
              <span className="text-muted-foreground">
                {t('branchContext.selectPlaceholder', 'Seleccionar sucursal')}
              </span>
            )}
          </span>
        </SelectTrigger>
        <SelectContent>
          {(branches ?? []).map((branch) => (
            <SelectItem key={branch.id} value={branch.id} className="text-xs">
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
