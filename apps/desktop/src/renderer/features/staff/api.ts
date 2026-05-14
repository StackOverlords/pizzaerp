import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/core/http/client'
import { queryKeys } from '@/core/http/query-keys'
import { useAuthStore } from '@/core/auth/store'
import { eventBus } from '@/core/events/event-bus'
import {
  userSchema,
  branchSchema,
  type User,
  type Branch,
  type CreateUserPayload,
  type UpdateUserPayload,
  type BranchFormInput,
} from './schemas'

// ── Users — Queries ────────────────────────────────────────────────────────────

export function useUsers() {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  return useQuery<User[]>({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const { data } = await api.get<unknown>('/api/v1/users')
      return z.array(userSchema).parse(data)
    },
    enabled: isAdmin,
    staleTime: 60_000,
  })
}

// ── Users — Mutations ──────────────────────────────────────────────────────────

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation<User, unknown, CreateUserPayload>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/users', input)
      return userSchema.parse(data)
    },
    onSuccess: async (user) => {
      await qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      eventBus.emit('staff.user.created', { userId: user.id, username: user.username })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation<User, unknown, { id: string; input: UpdateUserPayload }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.patch<unknown>(`/api/v1/users/${id}`, input)
      return userSchema.parse(data)
    },
    onSuccess: async (user) => {
      await qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      eventBus.emit('staff.user.updated', { userId: user.id })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      await api.delete(`/api/v1/users/${id}`)
    },
    onSuccess: async (_data, id) => {
      await qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      eventBus.emit('staff.user.deleted', { userId: id })
    },
  })
}

// ── Branches — Queries ─────────────────────────────────────────────────────────

export function useBranches() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<Branch[]>({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const { data } = await api.get<unknown>('/api/v1/branches')
      return z.array(branchSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  })
}

// ── Branches — Mutations ───────────────────────────────────────────────────────

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation<Branch, unknown, BranchFormInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/branches', input)
      return branchSchema.parse(data)
    },
    onSuccess: async (branch) => {
      await qc.invalidateQueries({ queryKey: queryKeys.branches.all() })
      eventBus.emit('staff.branch.created', { branchId: branch.id, name: branch.name })
    },
  })
}

export function useUpdateBranch() {
  const qc = useQueryClient()
  return useMutation<Branch, unknown, { id: string; input: BranchFormInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.patch<unknown>(`/api/v1/branches/${id}`, input)
      return branchSchema.parse(data)
    },
    onSuccess: async (branch) => {
      await qc.invalidateQueries({ queryKey: queryKeys.branches.all() })
      eventBus.emit('staff.branch.updated', { branchId: branch.id })
    },
  })
}

export function useDeleteBranch() {
  const qc = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      await api.delete(`/api/v1/branches/${id}`)
    },
    onSuccess: async (_data, id) => {
      await qc.invalidateQueries({ queryKey: queryKeys.branches.all() })
      eventBus.emit('staff.branch.deleted', { branchId: id })
    },
  })
}
