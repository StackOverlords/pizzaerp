import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'
import { authenticate } from '../../hooks/authenticate.hook'
import { authorize } from '../../hooks/authorize.hook'
import { UserRole } from '../../../domain/entities/user'
import type { JwtPayload } from '../../plugins/jwt.plugin'

// Tests para STA-13 — HU-004 Sistema de roles
// No requieren DB: los tokens se firman directamente con server.jwt.sign()

let server: FastifyInstance

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  server = await createServer()

  server.get('/api/v1/admin/dashboard',  { preHandler: [authenticate, authorize([UserRole.ADMIN])] },   () => ({ ok: true }))
  server.get('/api/v1/caja/turno',       { preHandler: [authenticate, authorize([UserRole.CAJERO])] },  () => ({ ok: true }))
  server.get('/api/v1/cocina/comandas',  { preHandler: [authenticate, authorize([UserRole.HORNERO])] }, () => ({ ok: true }))
})

afterAll(async () => {
  await server.close()
})

function signToken(role: UserRole) {
  return server.jwt.sign({
    user_id:   'test-user-id',
    tenant_id: 'test-tenant-id',
    branch_id: 'test-branch-id',
    role,
    type: 'access',
  } satisfies JwtPayload)
}

function bearer(role: UserRole) {
  return { Authorization: `Bearer ${signToken(role)}` }
}

// ─── CA-01 — El enum tiene los tres roles correctos ──────────────────────────

describe('CA-01 — UserRole enum', () => {
  it('contiene exactamente tres roles', () => {
    expect(Object.keys(UserRole)).toHaveLength(3)
  })

  it('los valores son ADMIN, CAJERO y HORNERO', () => {
    expect(UserRole.ADMIN).toBe('ADMIN')
    expect(UserRole.CAJERO).toBe('CAJERO')
    expect(UserRole.HORNERO).toBe('HORNERO')
  })
})

// ─── CA-02 — ADMIN tiene acceso universal ────────────────────────────────────

describe('CA-02 — ADMIN tiene acceso a todos los módulos', () => {
  it('accede a rutas de ADMIN', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/admin/dashboard', headers: bearer(UserRole.ADMIN) })
    expect(res.statusCode).toBe(200)
  })

  it('accede a rutas de CAJERO', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/caja/turno', headers: bearer(UserRole.ADMIN) })
    expect(res.statusCode).toBe(200)
  })

  it('accede a rutas de HORNERO', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/cocina/comandas', headers: bearer(UserRole.ADMIN) })
    expect(res.statusCode).toBe(200)
  })
})

// ─── CA-03 — CAJERO accede solo a su módulo ──────────────────────────────────

describe('CA-03 — CAJERO accede solo a venta, cobro y turno', () => {
  it('accede a rutas de CAJERO', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/caja/turno', headers: bearer(UserRole.CAJERO) })
    expect(res.statusCode).toBe(200)
  })

  it('no accede a rutas de HORNERO', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/cocina/comandas', headers: bearer(UserRole.CAJERO) })
    expect(res.statusCode).toBe(403)
  })
})

// ─── CA-04 — HORNERO accede solo a la pantalla de cocina ─────────────────────

describe('CA-04 — HORNERO accede solo a la vista de comandas', () => {
  it('accede a rutas de HORNERO', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/cocina/comandas', headers: bearer(UserRole.HORNERO) })
    expect(res.statusCode).toBe(200)
  })

  it('no accede a rutas de CAJERO', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/caja/turno', headers: bearer(UserRole.HORNERO) })
    expect(res.statusCode).toBe(403)
  })
})

// ─── CA-05 — CAJERO recibe 403 en /admin/* ───────────────────────────────────

describe('CA-05 — CAJERO recibe 403 en rutas de administrador', () => {
  it('devuelve 403 en /admin/dashboard', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/admin/dashboard', headers: bearer(UserRole.CAJERO) })
    expect(res.statusCode).toBe(403)
  })

  it('HORNERO también recibe 403 en /admin/dashboard', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/admin/dashboard', headers: bearer(UserRole.HORNERO) })
    expect(res.statusCode).toBe(403)
  })
})
