import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/http/client'
import { queryKeys } from '@/core/http/query-keys'
import type { SetupPayload } from './schemas'

export function useSetup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SetupPayload) => {
      await api.post('/api/v1/setup', payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.config.current() })
    },
  })
}
