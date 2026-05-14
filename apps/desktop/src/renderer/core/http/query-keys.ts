export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },

  config: {
    current: () => ['config'] as const,
  },

  orders: {
    all:    () => ['orders'] as const,
    lists:  () => ['orders', 'list'] as const,
    list:   (filters?: unknown) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', id] as const,
  },

  menu: {
    all:        () => ['menu'] as const,
    items:      () => ['menu', 'items'] as const,
    item:       (id: string) => ['menu', 'items', id] as const,
    dishes:     (opts?: { activeOnly?: boolean; categoryId?: string; availableAt?: string }) => ['menu', 'dishes', opts] as const,
    categories: (opts?: { activeOnly?: boolean }) => ['menu', 'categories', opts] as const,
  },

  shifts: {
    all:     () => ['shifts'] as const,
    current: () => ['shifts', 'current'] as const,
    history: (filters?: unknown) => ['shifts', 'history', filters] as const,
  },

  users: {
    all:      () => ['users'] as const,
    list:     () => ['users', 'list'] as const,
    /** @deprecated Use queryKeys.users.list() — kept for shifts.useStaffOptions backward compat. Both are invalidated by users.all(). */
    cashiers: () => ['users', 'cashiers'] as const,
  },

  branches: {
    all:    () => ['branches'] as const,
    list:   () => ['branches', 'list'] as const,
    detail: (id: string) => ['branches', 'detail', id] as const,
  },

  tenantSettings: {
    all:     () => ['tenant-settings'] as const,
    current: () => ['tenant-settings', 'current'] as const,
  },
}
