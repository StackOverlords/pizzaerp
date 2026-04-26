import axios from 'axios'
import { AxiosInterceptorManager } from 'sdk-simple-auth'
import { authSDK } from '@/core/auth/sdk'
import { toAppError } from '@/core/http/error'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

const interceptorManager = new AxiosInterceptorManager(api, {
  getAccessToken: () => authSDK.getValidAccessToken(),
  onSessionInvalid: () => authSDK.logout(),
  onTokenRefresh: async () => { await authSDK.refreshTokens() },
})
interceptorManager.setup()

// Normalize API errors into AppError so callers always get { message, status, code }
api.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(toAppError(error)),
)
