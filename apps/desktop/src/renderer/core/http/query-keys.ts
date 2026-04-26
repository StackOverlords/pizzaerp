export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },

  orders: {
    all:    () => ['orders'] as const,
    lists:  () => ['orders', 'list'] as const,
    list:   (filters?: unknown) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', id] as const,
  },

  menu: {
    all:    () => ['menu'] as const,
    items:  () => ['menu', 'items'] as const,
    item:   (id: string) => ['menu', 'items', id] as const,
  },
}
