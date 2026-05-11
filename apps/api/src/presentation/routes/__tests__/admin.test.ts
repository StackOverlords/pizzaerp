import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'

// Integration test — requiere DATABASE_URL y SUPER_ADMIN_KEY configurados

const prisma = new PrismaClient()

const ADMIN_KEY = 'test-admin-key-super-secret'

const TEST = {
  tenantSlug: 'test-admin-control',
  tenantSchema: 'tenant_test_admin_control',
}

let server: FastifyInstance
let controlTenantId: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  process.env.SUPER_ADMIN_KEY = ADMIN_KEY

  server = await createServer()
  await prisma.$connect()

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Admin Control Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
    },
  })
  controlTenantId = tenant.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { tenantId: controlTenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId: controlTenantId } })
  await prisma.tenant.deleteMany({ where: { id: controlTenantId } })
  // limpia tenants creados por tests de POST /admin/tenants
  await prisma.tenant.deleteMany({ where: { slug: 'nuevo-cliente-test' } })
  await prisma.$disconnect()
  await server.close()
})

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('Admin auth guard', () => {
  it('devuelve 401 sin X-Admin-Key', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/admin/stats' })
    expect(res.statusCode).toBe(401)
  })

  it('devuelve 401 con clave incorrecta', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/stats',
      headers: { 'x-admin-key': 'wrong-key' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /admin/stats ─────────────────────────────────────────────────────────

describe('GET /api/v1/admin/stats', () => {
  it('devuelve estadísticas con byStatus y total', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/stats',
      headers: { 'x-admin-key': ADMIN_KEY },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ total: number; byStatus: Record<string, number> }>()
    expect(typeof body.total).toBe('number')
    expect(typeof body.byStatus.ACTIVE).toBe('number')
    expect(body.total).toBeGreaterThanOrEqual(1)
  })
})

// ─── GET /admin/tenants ───────────────────────────────────────────────────────

describe('GET /api/v1/admin/tenants', () => {
  it('devuelve array con al menos el tenant de control', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/tenants',
      headers: { 'x-admin-key': ADMIN_KEY },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ id: string; branchCount: number }[]>()
    expect(Array.isArray(body)).toBe(true)
    expect(body.some((t) => t.id === controlTenantId)).toBe(true)
    const control = body.find((t) => t.id === controlTenantId)!
    expect(typeof control.branchCount).toBe('number')
  })
})

// ─── GET /admin/tenants/:id ───────────────────────────────────────────────────

describe('GET /api/v1/admin/tenants/:id', () => {
  it('devuelve el tenant con detalles', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/admin/tenants/${controlTenantId}`,
      headers: { 'x-admin-key': ADMIN_KEY },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ id: string; slug: string; branchCount: number }>()
    expect(body.id).toBe(controlTenantId)
    expect(body.slug).toBe(TEST.tenantSlug)
    expect(typeof body.branchCount).toBe('number')
  })

  it('devuelve 404 para tenant inexistente', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/tenants/id-que-no-existe',
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── POST /admin/tenants ──────────────────────────────────────────────────────

describe('POST /api/v1/admin/tenants', () => {
  it('crea un nuevo tenant y devuelve 201', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/tenants',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { tenantName: 'Nuevo Cliente Test', slug: 'nuevo-cliente-test', billingEmail: 'test@cliente.com' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; slug: string; status: string }>()
    expect(body.slug).toBe('nuevo-cliente-test')
    expect(body.status).toBe('ONBOARDING')
  })

  it('devuelve 409 si el slug ya existe', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/tenants',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { tenantName: 'Duplicado', slug: 'nuevo-cliente-test' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('devuelve 400 si slug tiene formato inválido', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/tenants',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { tenantName: 'Test', slug: 'Slug Invalido!' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─── PATCH /admin/tenants/:id/status ─────────────────────────────────────────

describe('PATCH /api/v1/admin/tenants/:id/status', () => {
  it('cambia el status del tenant', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/admin/tenants/${controlTenantId}/status`,
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { status: 'SUSPENDED' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ status: string }>().status).toBe('SUSPENDED')

    // restaurar
    await prisma.tenant.update({ where: { id: controlTenantId }, data: { status: 'ACTIVE' } })
  })

  it('devuelve 404 para tenant inexistente', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/admin/tenants/id-que-no-existe/status',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { status: 'ACTIVE' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── POST /admin/tenants/:id/users ────────────────────────────────────────────

describe('POST /api/v1/admin/tenants/:id/users', () => {
  it('crea un usuario ADMIN en el tenant', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/tenants/${controlTenantId}/users`,
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { username: 'admin-del-cliente', password: 'secreto123' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ username: string; role: string; tenantId: string }>()
    expect(body.username).toBe('admin-del-cliente')
    expect(body.role).toBe('ADMIN')
    expect(body.tenantId).toBe(controlTenantId)
  })

  it('devuelve 404 para tenant inexistente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/tenants/id-falso/users',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { username: 'usuario', password: 'secreto123' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── GET /admin/plans ─────────────────────────────────────────────────────────

describe('GET /api/v1/admin/plans', () => {
  it('devuelve array de planes', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/plans',
      headers: { 'x-admin-key': ADMIN_KEY },
    })

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })
})
