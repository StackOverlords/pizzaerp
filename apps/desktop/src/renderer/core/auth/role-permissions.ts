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
    'shifts:read',
    'shifts:write',
    'shifts:history',
  ],
  CAJERO: [
    'orders:read',
    'orders:write',
    'menu:read',
    'shifts:read',
    'shifts:write',
  ],
  HORNERO: [
    'orders:read',
  ],
}
