import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/core/http/client'
import { queryKeys } from '@/core/http/query-keys'
import { useAuthStore } from '@/core/auth/store'
import { useEffectiveBranchId } from '@/features/branch-context/hooks'
import {
  supplyTransferReportSchema,
  type SupplyTransferReport,
  type SupplyTransferReportFilters,
} from './schemas'

// ── Supply Transfer Report — Query ─────────────────────────────────────────────

export function useSupplyTransferReport(filters?: SupplyTransferReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const effectiveBranchId = useEffectiveBranchId()

  return useQuery<SupplyTransferReport[]>({
    queryKey: queryKeys.reports.supplyTransfers({ ...filters, _branch: effectiveBranchId }),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters?.from) params.from = filters.from
      if (filters?.to) params.to = filters.to
      if (user?.role === 'ADMIN' && !user.branchId && effectiveBranchId) {
        params.branchId = effectiveBranchId
      }
      const { data } = await api.get<unknown>('/api/v1/reports/supply-transfers', { params })
      return z.array(supplyTransferReportSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}
