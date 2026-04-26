import { AuthSDK } from 'sdk-simple-auth'

export const authSDK = new AuthSDK({
  authServiceUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  endpoints: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
  },
  backend: {
    type: 'node-express',
    userSearchPaths: ['user', 'data'],
    fieldMappings: {
      userId: ['id'],
      email: ['email'],
      name: ['name'],
    },
  },
  storage: { type: 'localStorage' },
  tokenRefresh: { enabled: true, bufferTime: 900 },
})
