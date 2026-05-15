import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/core/http/client'
import { queryKeys } from '@/core/http/query-keys'
import { useAuthStore } from '@/core/auth/store'
import { eventBus } from '@/core/events/event-bus'
import { useEffectiveBranchId } from '@/features/branch-context/hooks'
import { getEffectiveBranchId } from '@/features/branch-context/selectors'
import {
  supplyTypeSchema,
  supplyTransferSchema,
  supplyWastageSchema,
  supplyClosureSchema,
  supplyClosingSummaryItemSchema,
  type SupplyType,
  type SupplyTransfer,
  type SupplyWastage,
  type SupplyClosure,
  type SupplyClosingSummaryItem,
  type SupplyTransferFilters,
  type SupplyWastageFilters,
  type SupplyClosingFilters,
  type SupplyTypeFormInput,
  type CreateTransferFormInput,
  type ReceiveTransferFormInput,
  type LogWastageFormInput,
  type CloseSupplyDayFormInput,
} from './schemas'

// ── Supply Types — Queries ─────────────────────────────────────────────────────

export function useSupplyTypes() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<SupplyType[]>({
    queryKey: queryKeys.supply.types(),
    queryFn: async () => {
      const { data } = await api.get<unknown>('/api/v1/supply-types')
      return z.array(supplyTypeSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  })
}

// ── Supply Types — Mutations ───────────────────────────────────────────────────

export function useCreateSupplyType() {
  const qc = useQueryClient()
  return useMutation<SupplyType, unknown, SupplyTypeFormInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/supply-types', input)
      return supplyTypeSchema.parse(data)
    },
    onSuccess: async (supplyType) => {
      await qc.invalidateQueries({ queryKey: queryKeys.supply.all() })
      eventBus.emit('supply.type.created', { id: supplyType.id, name: supplyType.name })
    },
  })
}

export function useUpdateSupplyType() {
  const qc = useQueryClient()
  return useMutation<SupplyType, unknown, { id: string; input: SupplyTypeFormInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.put<unknown>(`/api/v1/supply-types/${id}`, input)
      return supplyTypeSchema.parse(data)
    },
    onSuccess: async (supplyType) => {
      await qc.invalidateQueries({ queryKey: queryKeys.supply.all() })
      eventBus.emit('supply.type.updated', { id: supplyType.id })
    },
  })
}

export function useDeactivateSupplyType() {
  const qc = useQueryClient()
  return useMutation<SupplyType, unknown, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<unknown>(`/api/v1/supply-types/${id}/deactivate`)
      return supplyTypeSchema.parse(data)
    },
    onSuccess: async (supplyType) => {
      await qc.invalidateQueries({ queryKey: queryKeys.supply.all() })
      eventBus.emit('supply.type.deactivated', { id: supplyType.id })
    },
  })
}

// ── Supply Transfers — Queries ─────────────────────────────────────────────────

export function useSupplyTransfers(filters?: SupplyTransferFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const effectiveBranchId = useEffectiveBranchId()
  return useQuery<SupplyTransfer[]>({
    queryKey: queryKeys.supply.transfers({ ...filters, _branch: effectiveBranchId }),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters?.status) params.status = filters.status
      if (filters?.from) params.from = filters.from
      if (filters?.to) params.to = filters.to
      if (user?.role === 'ADMIN' && !user.branchId && effectiveBranchId) {
        params.branchId = effectiveBranchId
      }
      const { data } = await api.get<unknown>('/api/v1/supply-transfers', { params })
      return z.array(supplyTransferSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

// ── Supply Transfers — Mutations ───────────────────────────────────────────────

export function useCreateSupplyTransfer() {
  const qc = useQueryClient()
  return useMutation<SupplyTransfer, unknown, CreateTransferFormInput>({
    mutationFn: async (input) => {
      const user = useAuthStore.getState().user
      const payload: CreateTransferFormInput & { branchId?: string } = { ...input }
      if (user?.role === 'ADMIN' && !user.branchId) {
        const branchId = getEffectiveBranchId()
        if (branchId) payload.branchId = branchId
      }
      const { data } = await api.post<unknown>('/api/v1/supply-transfers', payload)
      return supplyTransferSchema.parse(data)
    },
    onSuccess: async (transfer) => {
      await qc.invalidateQueries({ queryKey: queryKeys.supply.transfers() })
      eventBus.emit('supply.transfer.created', { id: transfer.id })
    },
  })
}

export function useReceiveSupplyTransfer() {
  const qc = useQueryClient()
  return useMutation<SupplyTransfer, unknown, { id: string; input: ReceiveTransferFormInput }>({
    mutationFn: async ({ id, input }) => {
      const user = useAuthStore.getState().user
      const payload: ReceiveTransferFormInput & { branchId?: string } = { ...input }
      if (user?.role === 'ADMIN' && !user.branchId) {
        const branchId = getEffectiveBranchId()
        if (branchId) payload.branchId = branchId
      }
      const { data } = await api.patch<unknown>(`/api/v1/supply-transfers/${id}/receive`, payload)
      return supplyTransferSchema.parse(data)
    },
    onSuccess: async (transfer) => {
      await qc.invalidateQueries({ queryKey: queryKeys.supply.transfers() })
      eventBus.emit('supply.transfer.received', { id: transfer.id })
    },
  })
}

// ── Supply Wastages — Queries ──────────────────────────────────────────────────

export function useSupplyWastages(filters?: SupplyWastageFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const effectiveBranchId = useEffectiveBranchId()
  return useQuery<SupplyWastage[]>({
    queryKey: queryKeys.supply.wastages({ ...filters, _branch: effectiveBranchId }),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters?.from) params.from = filters.from
      if (filters?.to) params.to = filters.to
      if (user?.role === 'ADMIN' && !user.branchId && effectiveBranchId) {
        params.branchId = effectiveBranchId
      }
      const { data } = await api.get<unknown>('/api/v1/supply-wastages', { params })
      return z.array(supplyWastageSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

// ── Supply Wastages — Mutations ────────────────────────────────────────────────

export function useLogSupplyWastage() {
  const qc = useQueryClient()
  return useMutation<SupplyWastage, unknown, LogWastageFormInput>({
    mutationFn: async (input) => {
      const user = useAuthStore.getState().user
      const payload: LogWastageFormInput & { branchId?: string } = { ...input }
      if (user?.role === 'ADMIN' && !user.branchId) {
        const branchId = getEffectiveBranchId()
        if (branchId) payload.branchId = branchId
      }
      const { data } = await api.post<unknown>('/api/v1/supply-wastages', payload)
      return supplyWastageSchema.parse(data)
    },
    onSuccess: async (wastage) => {
      await qc.invalidateQueries({ queryKey: queryKeys.supply.wastages() })
      eventBus.emit('supply.wastage.logged', { id: wastage.id })
    },
  })
}

// ── Supply Closings — Queries ──────────────────────────────────────────────────

export function useSupplyClosings(filters?: SupplyClosingFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const effectiveBranchId = useEffectiveBranchId()
  return useQuery<SupplyClosure[]>({
    queryKey: queryKeys.supply.closings({ ...filters, _branch: effectiveBranchId }),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters?.from) params.from = filters.from
      if (filters?.to) params.to = filters.to
      if (user?.role === 'ADMIN' && !user.branchId && effectiveBranchId) {
        params.branchId = effectiveBranchId
      }
      const { data } = await api.get<unknown>('/api/v1/supply-closings', { params })
      return z.array(supplyClosureSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useSupplyClosingSummary(date: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const effectiveBranchId = useEffectiveBranchId()
  return useQuery<SupplyClosingSummaryItem[]>({
    queryKey: queryKeys.supply.closingSummary(`${date ?? ''}_${effectiveBranchId ?? ''}`),
    queryFn: async () => {
      const params: Record<string, string> = { date: date! }
      if (user?.role === 'ADMIN' && !user.branchId && effectiveBranchId) {
        params.branchId = effectiveBranchId
      }
      const { data } = await api.get<unknown>('/api/v1/supply-closings/summary', { params })
      return z.array(supplyClosingSummaryItemSchema).parse(data)
    },
    enabled: isAuthenticated && !!date,
    staleTime: 30_000,
  })
}

// ── Supply Closings — Mutations ────────────────────────────────────────────────

export function useCloseSupplyDay() {
  const qc = useQueryClient()
  return useMutation<SupplyClosure, unknown, CloseSupplyDayFormInput>({
    mutationFn: async (input) => {
      const user = useAuthStore.getState().user
      const payload: CloseSupplyDayFormInput & { branchId?: string } = { ...input }
      if (user?.role === 'ADMIN' && !user.branchId) {
        const branchId = getEffectiveBranchId()
        if (branchId) payload.branchId = branchId
      }
      const { data } = await api.post<unknown>('/api/v1/supply-closings', payload)
      return supplyClosureSchema.parse(data)
    },
    onSuccess: async (closure) => {
      await qc.invalidateQueries({ queryKey: queryKeys.supply.closings() })
      await qc.invalidateQueries({ queryKey: queryKeys.supply.closingSummary(closure.closureDate) })
      eventBus.emit('supply.closing.done', { id: closure.id })
    },
  })
}
