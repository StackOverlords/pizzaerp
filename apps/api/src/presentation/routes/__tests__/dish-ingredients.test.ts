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
  tenantSlug: 'test-di-tenant',
  tenantSchema: 'tenant_test_di',
}

let server: FastifyInstance
let tenantId: string
let branchId: string
let adminToken: string
let cajeroToken: string
let dishId: string
let ingredientId: string
let ingredient2Id: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash('testpass', 12)
  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-di' },
    update: {},
    create: { name: '_test-plan-di' },
  })
  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'DI Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-di-test-001' },
    update: {},
    create: { id: 'branch-di-test-001', name: 'Branch Test', tenantId },
  })
  branchId = branch.id
  await prisma.user.upsert({
    where: { username_tenantId: { username: 'di-admin', tenantId } },
    update: {},
    create: { username: 'di-admin', passwordHash, role: 'ADMIN', tenantId, branchId },
  })
  await tenantService.provision(TEST.tenantSchema)

  const base: JwtPayload = { user_id: 'u1', tenant_id: tenantId, branch_id: branchId, role: UserRole.ADMIN, type: 'access' }
  adminToken = server.jwt.sign(base)
  cajeroToken = server.jwt.sign({ ...base, role: UserRole.CAJERO } satisfies JwtPayload)

  function auth(token: string) { return { Authorization: `Bearer ${token}` } }

  const dishRes = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { name: 'Margherita', salePrice: 1500 } })
  dishId = dishRes.json<{ id: string }>().id

  const ing1 = await server.inject({ method: 'POST', url: '/api/v1/ingredients', headers: auth(adminToken), payload: { name: 'Harina', purchaseUnit: 'kg', consumptionUnit: 'g', conversionFactor: 1000, wastagePercentage: 5 } })
  ingredientId = ing1.json<{ id: string }>().id

  const ing2 = await server.inject({ method: 'POST', url: '/api/v1/ingredients', headers: auth(adminToken), payload: { name: 'Mozzarella', purchaseUnit: 'kg', consumptionUnit: 'g', conversionFactor: 1000, wastagePercentage: 2 } })
  ingredient2Id = ing2.json<{ id: string }>().id
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-di' } })
  await prisma.$disconnect()
  await server.close()
})

function auth(token: string) { return { Authorization: `Bearer ${token}` } }

describe('POST /api/v1/dishes/:dishId/ingredients', () => {
  it('DI-01 — ADMIN agrega insumo INCLUDED', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/dishes/${dishId}/ingredients`,
      headers: auth(adminToken),
      payload: { ingredientId, baseQuantity: 200, behavior: 'INCLUDED' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.dishId).toBe(dishId)
    expect(body.ingredientId).toBe(ingredientId)
    expect(body.baseQuantity).toBe(200)
    expect(body.behavior).toBe('INCLUDED')
    expect(body.extraCost).toBeNull()
  })

  it('DI-02 — agrega insumo EXTRA con extraCost', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/dishes/${dishId}/ingredients`,
      headers: auth(adminToken),
      payload: { ingredientId: ingredient2Id, baseQuantity: 100, behavior: 'EXTRA', extraCost: 200 },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().behavior).toBe('EXTRA')
    expect(res.json().extraCost).toBe(200)
  })

  it('DI-03 — 409 si el insumo ya está asociado', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/dishes/${dishId}/ingredients`,
      headers: auth(adminToken),
      payload: { ingredientId, baseQuantity: 100, behavior: 'INCLUDED' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('DI-04 — 404 si el dish no existe', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dishes/no-existe/ingredients',
      headers: auth(adminToken),
      payload: { ingredientId, baseQuantity: 100, behavior: 'INCLUDED' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('DI-05 — 404 si el ingredient no existe', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/dishes/${dishId}/ingredients`,
      headers: auth(adminToken),
      payload: { ingredientId: 'no-existe', baseQuantity: 100, behavior: 'INCLUDED' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('DI-06 — 403 para CAJERO', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/dishes/${dishId}/ingredients`,
      headers: auth(cajeroToken),
      payload: { ingredientId, baseQuantity: 100, behavior: 'INCLUDED' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('DI-07 — 400 si behavior es inválido', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/dishes/${dishId}/ingredients`,
      headers: auth(adminToken),
      payload: { ingredientId, baseQuantity: 100, behavior: 'INVALID' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/v1/dishes/:dishId/ingredients', () => {
  it('DI-08 — lista los insumos del platillo', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/dishes/${dishId}/ingredients`, headers: auth(cajeroToken) })
    expect(res.statusCode).toBe(200)
    const list = res.json<{ ingredientId: string }[]>()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list.some(d => d.ingredientId === ingredientId)).toBe(true)
  })

  it('DI-09 — 404 si el dish no existe', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/dishes/no-existe/ingredients', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })
})

describe('PUT /api/v1/dishes/:dishId/ingredients/:ingredientId', () => {
  it('DI-10 — actualiza la asociación', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/dishes/${dishId}/ingredients/${ingredientId}`,
      headers: auth(adminToken),
      payload: { baseQuantity: 300, behavior: 'OPTIONAL', extraCost: 150 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().baseQuantity).toBe(300)
    expect(res.json().behavior).toBe('OPTIONAL')
    expect(res.json().extraCost).toBe(150)
  })

  it('DI-11 — 404 si la asociación no existe', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/dishes/${dishId}/ingredients/no-existe`,
      headers: auth(adminToken),
      payload: { baseQuantity: 100, behavior: 'INCLUDED' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/v1/dishes/:dishId/ingredients/:ingredientId', () => {
  it('DI-12 — elimina la asociación', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: `/api/v1/dishes/${dishId}/ingredients/${ingredient2Id}`,
      headers: auth(adminToken),
    })
    expect(res.statusCode).toBe(204)
  })

  it('DI-13 — 404 si ya no existe', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: `/api/v1/dishes/${dishId}/ingredients/${ingredient2Id}`,
      headers: auth(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })

  it('DI-14 — 403 para CAJERO', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: `/api/v1/dishes/${dishId}/ingredients/${ingredientId}`,
      headers: auth(cajeroToken),
    })
    expect(res.statusCode).toBe(403)
  })
})
