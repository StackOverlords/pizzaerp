import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'
import { TenantSchemaService } from '../../../infrastructure/database/tenant-schema.service'
import type { JwtPayload } from '../../plugins/jwt.plugin'
import { UserRole } from '../../../domain/entities/user'

// Integration test — requires a real PostgreSQL connection (DATABASE_URL) and JWT_SECRET

const prisma = new PrismaClient()
const tenantService = new TenantSchemaService(prisma)

const TEST = {
  tenantSlug: 'test-ingredients-tenant',
  tenantSchema: 'tenant_test_ingredients',
  username: 'ingredients-admin',
  password: 'testpass123',
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

  const passwordHash = await bcrypt.hash(TEST.password, 12)

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-ingredients' },
    update: {},
    create: { name: '_test-plan-ingredients' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Ingredients Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-ingredients-test-001' },
    update: {},
    create: { id: 'branch-ingredients-test-001', name: 'Branch Test', tenantId },
  })
  branchId = branch.id

  await prisma.user.upsert({
    where: { username_tenantId: { username: TEST.username, tenantId } },
    update: {},
    create: { username: TEST.username, passwordHash, role: 'ADMIN', tenantId, branchId },
  })

  await tenantService.provision(TEST.tenantSchema)

  const payload: JwtPayload = {
    user_id: 'test-user-id',
    tenant_id: tenantId,
    branch_id: branchId,
    role: UserRole.ADMIN,
    type: 'access',
  }
  adminToken = server.jwt.sign(payload)

  cajeroToken = server.jwt.sign({
    ...payload,
    role: UserRole.CAJERO,
  } satisfies JwtPayload)
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-ingredients' } })
  await prisma.$disconnect()
  await server.close()
})

// ─── Helper ──────────────────────────────────────────────────────────────────

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

const baseIngredient = {
  name: 'Harina 000',
  purchaseUnit: 'kg',
  consumptionUnit: 'g',
  conversionFactor: 1000,
  wastagePercentage: 5,
}

// ─── POST /ingredients ────────────────────────────────────────────────────────

describe('POST /api/v1/ingredients', () => {
  it('IN-01 — ADMIN crea un insumo correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      headers: authHeader(adminToken),
      payload: baseIngredient,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.name).toBe('Harina 000')
    expect(body.purchaseUnit).toBe('kg')
    expect(body.consumptionUnit).toBe('g')
    expect(body.conversionFactor).toBe(1000)
    expect(body.wastagePercentage).toBe(5)
    expect(body.active).toBe(true)
  })

  it('IN-02 — devuelve 403 para CAJERO', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      headers: authHeader(cajeroToken),
      payload: baseIngredient,
    })
    expect(res.statusCode).toBe(403)
  })

  it('IN-03 — devuelve 401 sin token', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      payload: baseIngredient,
    })
    expect(res.statusCode).toBe(401)
  })

  it('IN-04 — devuelve 400 si conversionFactor <= 0', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      headers: authHeader(adminToken),
      payload: { ...baseIngredient, conversionFactor: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('IN-05 — devuelve 400 si falta un campo requerido', async () => {
    const { name: _name, ...withoutName } = baseIngredient
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      headers: authHeader(adminToken),
      payload: withoutName,
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─── GET /ingredients ─────────────────────────────────────────────────────────

describe('GET /api/v1/ingredients', () => {
  it('IN-06 — CAJERO puede listar insumos', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/ingredients',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('IN-07 — activeOnly=true filtra solo insumos activos', async () => {
    // Crear un insumo activo y otro que desactivaremos
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      headers: authHeader(adminToken),
      payload: { ...baseIngredient, name: 'Insumo-para-desactivar' },
    })
    const created = createRes.json<{ id: string }>()

    await server.inject({
      method: 'PATCH',
      url: `/api/v1/ingredients/${created.id}/deactivate`,
      headers: authHeader(adminToken),
    })

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/ingredients?activeOnly=true',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const list = res.json<{ id: string; active: boolean }[]>()
    expect(list.every(i => i.active)).toBe(true)
    expect(list.find(i => i.id === created.id)).toBeUndefined()
  })
})

// ─── GET /ingredients/:id ─────────────────────────────────────────────────────

describe('GET /api/v1/ingredients/:id', () => {
  let ingredientId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      headers: authHeader(adminToken),
      payload: { ...baseIngredient, name: 'Tomate' },
    })
    ingredientId = res.json<{ id: string }>().id
  })

  it('IN-08 — devuelve el insumo correctamente', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/ingredients/${ingredientId}`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Tomate')
  })

  it('IN-09 — devuelve 404 para ID inexistente', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/ingredients/non-existent-id',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── PUT /ingredients/:id ─────────────────────────────────────────────────────

describe('PUT /api/v1/ingredients/:id', () => {
  let ingredientId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      headers: authHeader(adminToken),
      payload: { ...baseIngredient, name: 'Mozzarella' },
    })
    ingredientId = res.json<{ id: string }>().id
  })

  it('IN-10 — ADMIN actualiza un insumo', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/ingredients/${ingredientId}`,
      headers: authHeader(adminToken),
      payload: { ...baseIngredient, name: 'Mozzarella Actualizada', conversionFactor: 500 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.name).toBe('Mozzarella Actualizada')
    expect(body.conversionFactor).toBe(500)
  })

  it('IN-11 — devuelve 404 para ID inexistente', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/v1/ingredients/non-existent-id',
      headers: authHeader(adminToken),
      payload: baseIngredient,
    })
    expect(res.statusCode).toBe(404)
  })

  it('IN-12 — devuelve 403 para CAJERO', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/ingredients/${ingredientId}`,
      headers: authHeader(cajeroToken),
      payload: baseIngredient,
    })
    expect(res.statusCode).toBe(403)
  })
})

// ─── PATCH /ingredients/:id/deactivate ───────────────────────────────────────

describe('PATCH /api/v1/ingredients/:id/deactivate', () => {
  let ingredientId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/ingredients',
      headers: authHeader(adminToken),
      payload: { ...baseIngredient, name: 'Pepperoni' },
    })
    ingredientId = res.json<{ id: string }>().id
  })

  it('IN-13 — ADMIN desactiva un insumo', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/ingredients/${ingredientId}/deactivate`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().active).toBe(false)
  })

  it('IN-14 — devuelve 409 si ya está inactivo', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/ingredients/${ingredientId}/deactivate`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(409)
  })

  it('IN-15 — devuelve 404 para ID inexistente', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/ingredients/non-existent-id/deactivate',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })

  it('IN-16 — devuelve 403 para CAJERO', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/ingredients/${ingredientId}/deactivate`,
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(403)
  })
})
