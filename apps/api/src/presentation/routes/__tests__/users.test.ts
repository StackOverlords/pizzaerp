import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'
import type { JwtPayload } from '../../plugins/jwt.plugin'
import { UserRole } from '../../../domain/entities/user'

// Integration test — requires a real PostgreSQL connection (DATABASE_URL) and JWT_SECRET

const prisma = new PrismaClient()

const TEST = {
  tenantSlug: 'test-users-tenant',
  tenantSchema: 'tenant_test_users',
  adminUsername: 'users-admin-test',
  password: 'testpass123',
}

let server: FastifyInstance
let tenantId: string
let adminId: string
let cajeroToken: string
let adminToken: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash(TEST.password, 12)

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-users' },
    update: {},
    create: { name: '_test-plan-users' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Users Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const admin = await prisma.user.upsert({
    where: { username_tenantId: { username: TEST.adminUsername, tenantId } },
    update: {},
    create: { username: TEST.adminUsername, passwordHash, role: 'ADMIN', tenantId, branchId: null },
  })
  adminId = admin.id

  const payload: JwtPayload = {
    user_id: adminId,
    tenant_id: tenantId,
    branch_id: null,
    role: UserRole.ADMIN,
    type: 'access',
  }
  adminToken = server.jwt.sign(payload)
  cajeroToken = server.jwt.sign({ ...payload, user_id: 'test-users-cajero-id', role: UserRole.CAJERO } satisfies JwtPayload)
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.deleteMany({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-users' } })
  await prisma.$disconnect()
  await server.close()
})

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── GET /users ────────────────────────────────────────────────────────────────

describe('GET /api/v1/users', () => {
  it('US-01 — 401 sin token', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/users' })
    expect(res.statusCode).toBe(401)
  })

  it('US-02 — 403 si CAJERO intenta listar', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/users', headers: auth(cajeroToken) })
    expect(res.statusCode).toBe(403)
  })

  it('US-03 — ADMIN puede listar usuarios del tenant', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/users', headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ id: string; username: string; role: string }[]>()
    expect(Array.isArray(body)).toBe(true)
    // No debe incluir passwordHash ni pinHash
    expect(body[0]).not.toHaveProperty('passwordHash')
    expect(body[0]).not.toHaveProperty('pinHash')
    expect(body.some(u => u.username === TEST.adminUsername)).toBe(true)
  })
})

// ─── POST /users ───────────────────────────────────────────────────────────────

describe('POST /api/v1/users', () => {
  it('US-04 — 401 sin token', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/users', payload: { username: 'nuevo', password: 'pass123' } })
    expect(res.statusCode).toBe(401)
  })

  it('US-05 — 403 si CAJERO intenta crear', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/users', headers: auth(cajeroToken), payload: { username: 'nuevo', password: 'pass123' } })
    expect(res.statusCode).toBe(403)
  })

  it('US-06 — ADMIN crea usuario correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(adminToken),
      payload: { username: 'cajero-nuevo', password: 'pass123', role: 'CAJERO' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; username: string; role: string }>()
    expect(body.id).toBeDefined()
    expect(body.username).toBe('cajero-nuevo')
    expect(body.role).toBe('CAJERO')
    expect(body).not.toHaveProperty('passwordHash')
    expect(body).not.toHaveProperty('pinHash')
  })

  it('US-07 — 400 si username tiene menos de 3 caracteres', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(adminToken),
      payload: { username: 'ab', password: 'pass123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('US-08 — 400 si password tiene menos de 6 caracteres', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(adminToken),
      payload: { username: 'valid-user', password: '123' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─── PATCH /users/:id ──────────────────────────────────────────────────────────

describe('PATCH /api/v1/users/:id', () => {
  let targetUserId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(adminToken),
      payload: { username: 'user-to-patch', password: 'pass123', role: 'CAJERO' },
    })
    targetUserId = res.json<{ id: string }>().id
  })

  it('US-09 — ADMIN actualiza rol del usuario', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/users/${targetUserId}`,
      headers: auth(adminToken),
      payload: { role: 'HORNERO' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().role).toBe('HORNERO')
  })

  it('US-10 — 403 si ADMIN intenta modificarse a sí mismo', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/users/${adminId}`,
      headers: auth(adminToken),
      payload: { role: 'CAJERO' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('US-11 — 404 para usuario de otro tenant', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/users/usuario-de-otro-tenant-999',
      headers: auth(adminToken),
      payload: { role: 'CAJERO' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('US-12 — 403 si CAJERO intenta modificar', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/users/${targetUserId}`,
      headers: auth(cajeroToken),
      payload: { role: 'ADMIN' },
    })
    expect(res.statusCode).toBe(403)
  })
})

// ─── DELETE /users/:id ─────────────────────────────────────────────────────────

describe('DELETE /api/v1/users/:id', () => {
  let targetUserId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(adminToken),
      payload: { username: 'user-to-delete', password: 'pass123' },
    })
    targetUserId = res.json<{ id: string }>().id
  })

  it('US-13 — 403 si CAJERO intenta eliminar', async () => {
    const res = await server.inject({ method: 'DELETE', url: `/api/v1/users/${targetUserId}`, headers: auth(cajeroToken) })
    expect(res.statusCode).toBe(403)
  })

  it('US-14 — 403 si ADMIN intenta eliminarse a sí mismo', async () => {
    const res = await server.inject({ method: 'DELETE', url: `/api/v1/users/${adminId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(403)
  })

  it('US-15 — 404 para usuario de otro tenant', async () => {
    const res = await server.inject({ method: 'DELETE', url: '/api/v1/users/usuario-otro-tenant-999', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })

  it('US-16 — ADMIN elimina usuario correctamente', async () => {
    const res = await server.inject({ method: 'DELETE', url: `/api/v1/users/${targetUserId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(204)
  })
})
