import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'
import { TenantSchemaService } from '../../../infrastructure/database/tenant-schema.service'
import type { JwtPayload } from '../../plugins/jwt.plugin'
import { UserRole } from '../../../domain/entities/user'

const prisma = new PrismaClient()
const tenantService = new TenantSchemaService(prisma)

const TEST = {
  tenantSlug: 'test-categories-tenant',
  tenantSchema: 'tenant_test_categories',
}

let server: FastifyInstance
let tenantId: string
let branchId: string
let adminToken: string
let cajeroToken: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash('testpass', 12)
  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-categories' },
    update: {},
    create: { name: '_test-plan-categories' },
  })
  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Categories Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-categories-test-001' },
    update: {},
    create: { id: 'branch-categories-test-001', name: 'Branch Test', tenantId },
  })
  branchId = branch.id
  await prisma.user.upsert({
    where: { username_tenantId: { username: 'cat-admin', tenantId } },
    update: {},
    create: { username: 'cat-admin', passwordHash, role: 'ADMIN', tenantId, branchId },
  })
  await tenantService.provision(TEST.tenantSchema)

  const base: JwtPayload = { user_id: 'u1', tenant_id: tenantId, branch_id: branchId, role: UserRole.ADMIN, type: 'access' }
  adminToken = server.jwt.sign(base)
  cajeroToken = server.jwt.sign({ ...base, role: UserRole.CAJERO } satisfies JwtPayload)
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-categories' } })
  await prisma.$disconnect()
  await server.close()
})

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

const base = { name: 'Pizzas', orderIndex: 1 }

describe('POST /api/v1/categories', () => {
  it('CT-01 — ADMIN crea categoría', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/categories', headers: auth(adminToken), payload: base })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.name).toBe('Pizzas')
    expect(body.orderIndex).toBe(1)
    expect(body.active).toBe(true)
  })

  it('CT-02 — 403 para CAJERO', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/categories', headers: auth(cajeroToken), payload: base })
    expect(res.statusCode).toBe(403)
  })

  it('CT-03 — 400 si falta name', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/categories', headers: auth(adminToken), payload: { orderIndex: 0 } })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/v1/categories', () => {
  it('CT-04 — CAJERO puede listar categorías', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/categories', headers: auth(cajeroToken) })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('CT-05 — activeOnly filtra correctamente', async () => {
    const createRes = await server.inject({ method: 'POST', url: '/api/v1/categories', headers: auth(adminToken), payload: { name: 'Para-desactivar', orderIndex: 99 } })
    const id = createRes.json<{ id: string }>().id
    await server.inject({ method: 'PATCH', url: `/api/v1/categories/${id}/deactivate`, headers: auth(adminToken) })

    const res = await server.inject({ method: 'GET', url: '/api/v1/categories?activeOnly=true', headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    const list = res.json<{ id: string; active: boolean }[]>()
    expect(list.every(c => c.active)).toBe(true)
    expect(list.find(c => c.id === id)).toBeUndefined()
  })
})

describe('GET /api/v1/categories/:id', () => {
  let id: string
  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/categories', headers: auth(adminToken), payload: { name: 'Empanadas', orderIndex: 2 } })
    id = res.json<{ id: string }>().id
  })

  it('CT-06 — devuelve la categoría', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/categories/${id}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Empanadas')
  })

  it('CT-07 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/categories/no-existe', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })
})

describe('PUT /api/v1/categories/:id', () => {
  let id: string
  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/categories', headers: auth(adminToken), payload: { name: 'Bebidas', orderIndex: 3 } })
    id = res.json<{ id: string }>().id
  })

  it('CT-08 — actualiza correctamente', async () => {
    const res = await server.inject({ method: 'PUT', url: `/api/v1/categories/${id}`, headers: auth(adminToken), payload: { name: 'Bebidas Frías', orderIndex: 5 } })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Bebidas Frías')
    expect(res.json().orderIndex).toBe(5)
  })

  it('CT-09 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'PUT', url: '/api/v1/categories/no-existe', headers: auth(adminToken), payload: base })
    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /api/v1/categories/:id/deactivate', () => {
  let id: string
  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/categories', headers: auth(adminToken), payload: { name: 'Postres', orderIndex: 4 } })
    id = res.json<{ id: string }>().id
  })

  it('CT-10 — desactiva correctamente', async () => {
    const res = await server.inject({ method: 'PATCH', url: `/api/v1/categories/${id}/deactivate`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().active).toBe(false)
  })

  it('CT-11 — 409 si ya está inactiva', async () => {
    const res = await server.inject({ method: 'PATCH', url: `/api/v1/categories/${id}/deactivate`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(409)
  })

  it('CT-12 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'PATCH', url: '/api/v1/categories/no-existe/deactivate', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })
})
