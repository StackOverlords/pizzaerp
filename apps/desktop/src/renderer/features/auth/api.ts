import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/core/auth/store'

export function useLogout() {
  return useMutation<void, unknown, void>({
    mutationFn: () => useAuthStore.getState().logout(),
  })
}
