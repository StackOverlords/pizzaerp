import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/core/http/client'
import { queryKeys } from '@/core/http/query-keys'
import { useAuthStore } from '@/core/auth/store'

const tenantSettingsSchema = z.object({
  requirePinForCancel:   z.boolean(),
  requirePinForDiscount: z.boolean(),
  blindCloseEnabled:     z.boolean(),
})
export type TenantSettings = z.infer<typeof tenantSettingsSchema>

export function useTenantSettings() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<TenantSettings>({
    queryKey: queryKeys.tenantSettings.current(),
    queryFn: async () => {
      const { data } = await api.get<unknown>('/api/v1/tenant-settings')
      return tenantSettingsSchema.parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useUpdateTenantSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      await api.patch('/api/v1/tenant-settings', { key, value })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenantSettings.all() })
    },
  })
}

export function useSetPin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      await api.patch('/api/v1/auth/pin', { pin })
    },
  })
}

export function useMigrateTenantSchema() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/api/v1/tenant-settings/migrate', {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenantSettings.all() })
    },
  })
}
