import { create } from 'zustand'
import { authSDK } from './sdk'
import { eventBus } from '@/core/events/event-bus'
import type { User, AuthState } from './types'

interface AuthStore extends AuthState {
  _sync: (user: User | null, isAuthenticated: boolean, isLoading: boolean) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  _sync: (user, isAuthenticated, isLoading) =>
    set({ user, isAuthenticated, isLoading, token: null }),

  login: async (email, password) => {
    set({ isLoading: true })
    await authSDK.login({ email, password })
  },

  logout: async () => {
    await authSDK.logout()
  },

  hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
  hasRole: (role) => get().user?.roles.includes(role) ?? false,
  hasAnyRole: (roles) => roles.some((r) => get().user?.roles.includes(r) ?? false),
}))

// Sync SDK state → Zustand store + emit auth events
authSDK.onAuthStateChanged((state) => {
  const prev = useAuthStore.getState()
  const user = state.user as User | null

  useAuthStore.getState()._sync(user, state.isAuthenticated, state.loading ?? false)

  if (!prev.isAuthenticated && state.isAuthenticated && user) {
    eventBus.emit('auth.session.started', { userId: user.id })
  }
  if (prev.isAuthenticated && !state.isAuthenticated) {
    eventBus.emit('auth.session.ended', undefined)
  }
})
