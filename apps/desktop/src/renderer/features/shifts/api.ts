import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/http/client'
import { queryKeys } from '@/core/http/query-keys'
import { useAuthStore } from '@/core/auth/store'
import type { FilterOption } from '@/components/data-table'
import {
  shiftSchema,
  closeShiftResponseSchema,
  shiftHistoryPageSchema,
  type Shift,
  type OpenShiftInput,
  type CloseShiftInput,
  type CloseShiftResponse,
  type ShiftHistoryFilters,
  type ShiftHistoryPage,
} from './schemas'

export function useCurrentShift() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<Shift | null>({
    queryKey: queryKeys.shifts.current(),
    queryFn: async () => {
      const { data } = await api.get<unknown>('/api/v1/shifts/current')
      if (data === null || data === undefined) return null
      return shiftSchema.parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  })
}

export function useOpenShift() {
  const queryClient = useQueryClient()
  return useMutation<Shift, unknown, OpenShiftInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/shifts/open', input)
      return shiftSchema.parse(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() })
    },
  })
}

export function useCloseShift() {
  const queryClient = useQueryClient()
  return useMutation<CloseShiftResponse, unknown, CloseShiftInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/shifts/close', input)
      return closeShiftResponseSchema.parse(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() })
    },
  })
}

/**
 * @deprecated Use queryKeys.users.list() + filter('CAJERO') in callsites once shifts migrates.
 * Coexists with staff.useUsers() — both queryKeys are invalidated by queryKeys.users.all().
 */
export function useStaffOptions(): { data?: FilterOption[]; isLoading?: boolean } {
  return useQuery({
    queryKey: queryKeys.users.cashiers(),
    queryFn: async () => {
      const { data } = await api.get<{ id: string; username: string; role: string }[]>('/api/v1/users')
      return (data ?? [])
        .filter((u) => u.role === 'CAJERO')
        .map((u): FilterOption => ({ label: u.username, value: u.id }))
    },
    staleTime: 60_000,
  })
}

export function useShiftHistory(filters: ShiftHistoryFilters) {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  return useQuery<ShiftHistoryPage>({
    queryKey: queryKeys.shifts.history(filters),
    queryFn: async () => {
      const { data } = await api.get<unknown>('/api/v1/shifts/history', { params: filters })
      return shiftHistoryPageSchema.parse(data)
    },
    enabled: isAdmin,
    staleTime: 30_000,
  })
}
