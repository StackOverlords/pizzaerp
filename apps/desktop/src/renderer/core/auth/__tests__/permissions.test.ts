import { describe, it, expect } from 'vitest'
import { ROLE_PERMISSIONS } from '../role-permissions'
import { canAccess } from '@/core/routing/guards'
import type { User } from '../types'

const makeUser = (role: User['role']): User => ({
  id: '1',
  username: 'test',
  role,
  tenantId: 't1',
  branchId: null,
})

const route = (overrides: object) => ({
  id: 'x',
  path: '/x',
  label: 'X',
  element: null,
  ...overrides,
})

// CO-18: mapa de permisos por rol
describe('ROLE_PERMISSIONS', () => {
  it('ADMIN tiene todos los permisos de gestión', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toContain('orders:read')
    expect(ROLE_PERMISSIONS.ADMIN).toContain('orders:write')
    expect(ROLE_PERMISSIONS.ADMIN).toContain('menu:write')
    expect(ROLE_PERMISSIONS.ADMIN).toContain('staff:write')
    expect(ROLE_PERMISSIONS.ADMIN).toContain('settings:write')
    expect(ROLE_PERMISSIONS.ADMIN).toContain('reports:read')
  })

  it('CAJERO tiene permisos de órdenes y menú lectura únicamente', () => {
    expect(ROLE_PERMISSIONS.CAJERO).toContain('orders:read')
    expect(ROLE_PERMISSIONS.CAJERO).toContain('orders:write')
    expect(ROLE_PERMISSIONS.CAJERO).toContain('menu:read')
    expect(ROLE_PERMISSIONS.CAJERO).not.toContain('staff:write')
    expect(ROLE_PERMISSIONS.CAJERO).not.toContain('settings:write')
    expect(ROLE_PERMISSIONS.CAJERO).not.toContain('reports:read')
  })

  it('HORNERO tiene solo orders:read', () => {
    expect(ROLE_PERMISSIONS.HORNERO).toEqual(['orders:read'])
  })
})

// CO-19 + CO-20: canAccess
describe('canAccess', () => {
  it('CO-19: ruta sin restricciones es accesible para usuario null', () => {
    expect(canAccess(route({}), null)).toBe(true)
  })

  it('CO-19: ruta con permissions deniega usuario null', () => {
    expect(canAccess(route({ permissions: ['staff:write'] }), null)).toBe(false)
  })

  it('CO-19: ruta con roles deniega usuario null', () => {
    expect(canAccess(route({ roles: ['ADMIN'] }), null)).toBe(false)
  })

  it('CO-20: ADMIN accede a ruta que requiere staff:write', () => {
    expect(canAccess(route({ permissions: ['staff:write'] }), makeUser('ADMIN'))).toBe(true)
  })

  it('CO-20: CAJERO no accede a ruta que requiere staff:write', () => {
    expect(canAccess(route({ permissions: ['staff:write'] }), makeUser('CAJERO'))).toBe(false)
  })

  it('CO-20: HORNERO no accede a ruta que requiere orders:write', () => {
    expect(canAccess(route({ permissions: ['orders:write'] }), makeUser('HORNERO'))).toBe(false)
  })

  it('CO-20: acceso por role ADMIN concedido a ruta roles:[ADMIN]', () => {
    expect(canAccess(route({ roles: ['ADMIN'] }), makeUser('ADMIN'))).toBe(true)
  })

  it('CO-20: CAJERO denegado en ruta roles:[ADMIN]', () => {
    expect(canAccess(route({ roles: ['ADMIN'] }), makeUser('CAJERO'))).toBe(false)
  })
})
