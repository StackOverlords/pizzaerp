import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/core/http/query-keys'
import { useAppConfigStore } from './store'
import type { AppConfig } from './schemas'

// Plain axios instance — no auth interceptors. GET /api/v1/config is public
// and runs before any session exists, so the shared `api` client (which has
// the sdk-simple-auth interceptor) would fail if it finds an expired token.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 10_000,
})

export const useAppConfig = () =>
  useQuery<AppConfig>({
    queryKey: queryKeys.config.current(),
    queryFn:  async () => {
      const { data } = await publicApi.get<AppConfig>('/api/v1/config')
      useAppConfigStore.getState().setConfig(data)
      return data
    },
    staleTime: Infinity,
    retry:     3,
  })
