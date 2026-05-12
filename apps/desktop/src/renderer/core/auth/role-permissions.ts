import type { UserRole } from './types'

export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  ADMIN: [
    'orders:read',
    'orders:write',
    'menu:read',
    'menu:write',
    'staff:read',
    'staff:write',
    'reports:read',
    'settings:write',
  ],
  CAJERO: [
    'orders:read',
    'orders:write',
    'menu:read',
  ],
  HORNERO: [
    'orders:read',
  ],
}
