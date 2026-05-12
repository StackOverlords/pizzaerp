import { create } from 'zustand'
import { authSDK } from './sdk'
import { api } from '@/core/http/client'
import { eventBus } from '@/core/events/event-bus'
import { ROLE_PERMISSIONS } from './role-permissions'
import type { User, AuthState, UserRole } from './types'

interface LoginParams {
  username: string
  password: string
  slug?: string
}

interface AuthStore extends AuthState {
  _sync: (user: User | null, isAuthenticated: boolean, isLoading: boolean) => void
  login: (params: LoginParams) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: UserRole) => boolean
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  _sync: (user, isAuthenticated, isLoading) =>
    set({ user, isAuthenticated, isLoading, token: null }),

  login: async ({ username, password, slug }) => {
    set({ isLoading: true })
    await authSDK.login({ username, password, slug })
  },

  logout: async () => {
    await authSDK.logout()
  },

  hasPermission: (permission) => {
    const user = get().user
    if (!user) return false
    return (ROLE_PERMISSIONS[user.role] as readonly string[]).includes(permission)
  },

  hasRole: (role) => get().user?.role === role,
}))

// Sync SDK state → Zustand store + emit auth events
authSDK.onAuthStateChanged(async (state) => {
  const prev = useAuthStore.getState()

  useAuthStore.getState()._sync(state.user as User | null, state.isAuthenticated, state.loading ?? false)

  if (!prev.isAuthenticated && state.isAuthenticated) {
    try {
      const { data } = await api.get<User>('/api/v1/auth/me')
      useAuthStore.getState()._sync(data, true, false)
      eventBus.emit('auth.session.started', { userId: data.id })
    } catch {
      eventBus.emit('auth.session.started', { userId: (state.user as User | null)?.id ?? '' })
    }
  }

  if (prev.isAuthenticated && !state.isAuthenticated) {
    eventBus.emit('auth.session.ended', undefined)
  }
})
