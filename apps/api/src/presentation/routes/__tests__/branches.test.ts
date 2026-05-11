import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'
import type { JwtPayload } from '../../plugins/jwt.plugin'
import { UserRole } from '../../../domain/entities/user'

// Integration test — requires a real PostgreSQL connection (DATABASE_URL) and JWT_SECRET

const prisma = new PrismaClient()

const TEST = {
  tenantSlug: 'test-branches-tenant',
  tenantSchema: 'tenant_test_branches',
}

let server: FastifyInstance
let tenantId: string
let adminToken: string
let cajeroToken: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  server = await createServer()
  await prisma.$connect()

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-branches' },
    update: {},
    create: { name: '_test-plan-branches' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Branches Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const payload: JwtPayload = {
    user_id: 'test-branches-admin-id',
    tenant_id: tenantId,
    branch_id: null,
    role: UserRole.ADMIN,
    type: 'access',
  }
  adminToken = server.jwt.sign(payload)
  cajeroToken = server.jwt.sign({ ...payload, user_id: 'test-branches-cajero-id', role: UserRole.CAJERO } satisfies JwtPayload)
})

afterAll(async () => {
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.deleteMany({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-branches' } })
  await prisma.$disconnect()
  await server.close()
})

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── GET /branches ─────────────────────────────────────────────────────────────

describe('GET /api/v1/branches', () => {
  it('BR-01 — 401 sin token', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/branches' })
    expect(res.statusCode).toBe(401)
  })

  it('BR-02 — ADMIN puede listar sucursales', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/branches', headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('BR-03 — CAJERO puede listar sucursales', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/branches', headers: auth(cajeroToken) })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })
})

// ─── POST /branches ────────────────────────────────────────────────────────────

describe('POST /api/v1/branches', () => {
  it('BR-04 — 401 sin token', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/branches', payload: { name: 'Sucursal Sur' } })
    expect(res.statusCode).toBe(401)
  })

  it('BR-05 — 403 si CAJERO intenta crear', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/branches', headers: auth(cajeroToken), payload: { name: 'Sucursal Sur' } })
    expect(res.statusCode).toBe(403)
  })

  it('BR-06 — ADMIN crea sucursal correctamente', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/branches', headers: auth(adminToken), payload: { name: 'Sucursal Norte' } })
    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; name: string; tenantId: string }>()
    expect(body.id).toBeDefined()
    expect(body.name).toBe('Sucursal Norte')
    expect(body.tenantId).toBe(tenantId)
  })

  it('BR-07 — 400 si falta name', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/branches', headers: auth(adminToken), payload: {} })
    expect(res.statusCode).toBe(400)
  })

  it('BR-08 — 400 si name es cadena vacía', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/branches', headers: auth(adminToken), payload: { name: '' } })
    expect(res.statusCode).toBe(400)
  })
})

// ─── GET /branches/:id ─────────────────────────────────────────────────────────

describe('GET /api/v1/branches/:id', () => {
  let createdId: string

  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/branches', headers: auth(adminToken), payload: { name: 'Sucursal Detalle' } })
    createdId = res.json<{ id: string }>().id
  })

  it('BR-09 — devuelve la sucursal por ID', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/branches/${createdId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Sucursal Detalle')
  })

  it('BR-10 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/branches/no-existe-nunca', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })
})

// ─── PATCH /branches/:id ───────────────────────────────────────────────────────

describe('PATCH /api/v1/branches/:id', () => {
  let createdId: string

  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/branches', headers: auth(adminToken), payload: { name: 'Sucursal Original' } })
    createdId = res.json<{ id: string }>().id
  })

  it('BR-11 — ADMIN actualiza nombre correctamente', async () => {
    const res = await server.inject({ method: 'PATCH', url: `/api/v1/branches/${createdId}`, headers: auth(adminToken), payload: { name: 'Sucursal Actualizada' } })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Sucursal Actualizada')
  })

  it('BR-12 — 403 si CAJERO intenta actualizar', async () => {
    const res = await server.inject({ method: 'PATCH', url: `/api/v1/branches/${createdId}`, headers: auth(cajeroToken), payload: { name: 'Intento Cajero' } })
    expect(res.statusCode).toBe(403)
  })

  it('BR-13 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'PATCH', url: '/api/v1/branches/no-existe-nunca', headers: auth(adminToken), payload: { name: 'Nuevo nombre' } })
    expect(res.statusCode).toBe(404)
  })
})

// ─── DELETE /branches/:id ──────────────────────────────────────────────────────

describe('DELETE /api/v1/branches/:id', () => {
  let createdId: string

  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/branches', headers: auth(adminToken), payload: { name: 'Sucursal a Eliminar' } })
    createdId = res.json<{ id: string }>().id
  })

  it('BR-14 — 403 si CAJERO intenta eliminar', async () => {
    const res = await server.inject({ method: 'DELETE', url: `/api/v1/branches/${createdId}`, headers: auth(cajeroToken) })
    expect(res.statusCode).toBe(403)
  })

  it('BR-15 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'DELETE', url: '/api/v1/branches/no-existe-nunca', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })

  it('BR-16 — ADMIN elimina sucursal correctamente', async () => {
    const res = await server.inject({ method: 'DELETE', url: `/api/v1/branches/${createdId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(204)
  })

  it('BR-17 — 404 después de eliminar', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/branches/${createdId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })
})
