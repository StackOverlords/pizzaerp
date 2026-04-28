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
  tenantSlug: 'test-dishes-tenant',
  tenantSchema: 'tenant_test_dishes',
}

let server: FastifyInstance
let tenantId: string
let branchId: string
let adminToken: string
let cajeroToken: string
let categoryId: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash('testpass', 12)
  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-dishes' },
    update: {},
    create: { name: '_test-plan-dishes' },
  })
  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Dishes Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-dishes-test-001' },
    update: {},
    create: { id: 'branch-dishes-test-001', name: 'Branch Test', tenantId },
  })
  branchId = branch.id
  await prisma.user.upsert({
    where: { username_tenantId: { username: 'dish-admin', tenantId } },
    update: {},
    create: { username: 'dish-admin', passwordHash, role: 'ADMIN', tenantId, branchId },
  })
  await tenantService.provision(TEST.tenantSchema)

  const base: JwtPayload = { user_id: 'u1', tenant_id: tenantId, branch_id: branchId, role: UserRole.ADMIN, type: 'access' }
  adminToken = server.jwt.sign(base)
  cajeroToken = server.jwt.sign({ ...base, role: UserRole.CAJERO } satisfies JwtPayload)

  // Crear una categoría de prueba
  const catRes = await server.inject({ method: 'POST', url: '/api/v1/categories', headers: { Authorization: `Bearer ${adminToken}` }, payload: { name: 'Pizzas', orderIndex: 1 } })
  categoryId = catRes.json<{ id: string }>().id
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-dishes' } })
  await prisma.$disconnect()
  await server.close()
})

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

const baseDish = { name: 'Margherita', salePrice: 1500 }

describe('POST /api/v1/dishes', () => {
  it('DI-01 — ADMIN crea platillo sin categoría', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: baseDish })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.name).toBe('Margherita')
    expect(body.salePrice).toBe(1500)
    expect(body.categoryId).toBeNull()
    expect(body.active).toBe(true)
    expect(body.updatedAt).toBeDefined()
    expect(body.availableFrom).toBeNull()
    expect(body.availableTo).toBeNull()
  })

  it('DI-02 — crea platillo con categoría y campos opcionales', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dishes',
      headers: auth(adminToken),
      payload: { name: 'Napolitana', salePrice: 1800, categoryId, description: 'Con ajo y tomate', imageUrl: 'https://example.com/img.jpg' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.categoryId).toBe(categoryId)
    expect(body.description).toBe('Con ajo y tomate')
  })

  it('DI-02b — crea platillo con disponibilidad horaria', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dishes',
      headers: auth(adminToken),
      payload: { name: 'Menú del día', salePrice: 1200, availableFrom: '12:00:00', availableTo: '15:00:00' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.availableFrom).toBe('12:00:00')
    expect(body.availableTo).toBe('15:00:00')
  })

  it('DI-03 — 403 para CAJERO', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(cajeroToken), payload: baseDish })
    expect(res.statusCode).toBe(403)
  })

  it('DI-04 — 400 si salePrice <= 0', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { ...baseDish, salePrice: 0 } })
    expect(res.statusCode).toBe(400)
  })

  it('DI-05 — 400 si falta name', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { salePrice: 1000 } })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/v1/dishes', () => {
  it('DI-06 — CAJERO puede listar platillos', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/dishes', headers: auth(cajeroToken) })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('DI-07 — filtra por categoryId', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/dishes?categoryId=${categoryId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    const list = res.json<{ categoryId: string }[]>()
    expect(list.every(d => d.categoryId === categoryId)).toBe(true)
  })

  it('DI-07b — availableAt filtra por horario', async () => {
    // "Menú del día" disponible 12:00-15:00
    const at13 = await server.inject({ method: 'GET', url: '/api/v1/dishes?availableAt=13:00', headers: auth(adminToken) })
    expect(at13.statusCode).toBe(200)
    const in13 = at13.json<{ name: string; availableFrom: string | null }[]>()
    expect(in13.some(d => d.name === 'Menú del día')).toBe(true)

    // A las 20:00 no debe aparecer
    const at20 = await server.inject({ method: 'GET', url: '/api/v1/dishes?availableAt=20:00', headers: auth(adminToken) })
    const in20 = at20.json<{ name: string }[]>()
    expect(in20.some(d => d.name === 'Menú del día')).toBe(false)
  })

  it('DI-08 — activeOnly filtra correctamente', async () => {
    const createRes = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { name: 'Para-desactivar', salePrice: 100 } })
    const id = createRes.json<{ id: string }>().id
    await server.inject({ method: 'PATCH', url: `/api/v1/dishes/${id}/deactivate`, headers: auth(adminToken) })

    const res = await server.inject({ method: 'GET', url: '/api/v1/dishes?activeOnly=true', headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    const list = res.json<{ id: string; active: boolean }[]>()
    expect(list.every(d => d.active)).toBe(true)
    expect(list.find(d => d.id === id)).toBeUndefined()
  })
})

describe('GET /api/v1/dishes/:id', () => {
  let id: string
  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { name: 'Cuatro Quesos', salePrice: 2000 } })
    id = res.json<{ id: string }>().id
  })

  it('DI-09 — devuelve el platillo', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/dishes/${id}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Cuatro Quesos')
  })

  it('DI-10 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/dishes/no-existe', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })
})

describe('PUT /api/v1/dishes/:id', () => {
  let id: string
  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { name: 'Capricciosa', salePrice: 1600 } })
    id = res.json<{ id: string }>().id
  })

  it('DI-11 — actualiza correctamente', async () => {
    const res = await server.inject({ method: 'PUT', url: `/api/v1/dishes/${id}`, headers: auth(adminToken), payload: { name: 'Capricciosa Actualizada', salePrice: 1700, categoryId, description: null, imageUrl: null } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.name).toBe('Capricciosa Actualizada')
    expect(body.salePrice).toBe(1700)
    expect(body.categoryId).toBe(categoryId)
  })

  it('DI-12 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'PUT', url: '/api/v1/dishes/no-existe', headers: auth(adminToken), payload: baseDish })
    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /api/v1/dishes/:id/deactivate', () => {
  let id: string
  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { name: 'Hawaiana', salePrice: 1400 } })
    id = res.json<{ id: string }>().id
  })

  it('DI-13 — desactiva correctamente', async () => {
    const res = await server.inject({ method: 'PATCH', url: `/api/v1/dishes/${id}/deactivate`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().active).toBe(false)
  })

  it('DI-14 — 409 si ya está inactivo', async () => {
    const res = await server.inject({ method: 'PATCH', url: `/api/v1/dishes/${id}/deactivate`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(409)
  })

  it('DI-15 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'PATCH', url: '/api/v1/dishes/no-existe/deactivate', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })
})

// ─── POST /dishes/:id/clone ───────────────────────────────────────────────────

describe('POST /api/v1/dishes/:id/clone', () => {
  let originalId: string
  let ingredientId: string

  beforeAll(async () => {
    // Crear platillo original con un insumo
    const dishRes = await server.inject({
      method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken),
      payload: { name: 'Fugazzeta', salePrice: 2200, availableFrom: '18:00:00', availableTo: '23:00:00' },
    })
    originalId = dishRes.json<{ id: string }>().id

    const ingRes = await server.inject({
      method: 'POST', url: '/api/v1/ingredients', headers: auth(adminToken),
      payload: { name: 'Cebolla', purchaseUnit: 'kg', consumptionUnit: 'g', conversionFactor: 1000, wastagePercentage: 10 },
    })
    ingredientId = ingRes.json<{ id: string }>().id

    await server.inject({
      method: 'POST', url: `/api/v1/dishes/${originalId}/ingredients`, headers: auth(adminToken),
      payload: { ingredientId, baseQuantity: 150, behavior: 'INCLUDED' },
    })
  })

  it('DI-16 — clona con nombre automático "Copia de ..."', async () => {
    const res = await server.inject({ method: 'POST', url: `/api/v1/dishes/${originalId}/clone`, headers: auth(adminToken), payload: {} })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).not.toBe(originalId)
    expect(body.name).toBe('Copia de Fugazzeta')
    expect(body.salePrice).toBe(2200)
    expect(body.availableFrom).toBe('18:00:00')
    expect(body.availableTo).toBe('23:00:00')
    expect(body.active).toBe(true)
  })

  it('DI-17 — clona con nombre personalizado', async () => {
    const res = await server.inject({ method: 'POST', url: `/api/v1/dishes/${originalId}/clone`, headers: auth(adminToken), payload: { name: 'Fugazzeta Especial' } })
    expect(res.statusCode).toBe(201)
    expect(res.json().name).toBe('Fugazzeta Especial')
  })

  it('DI-18 — el clon tiene los mismos insumos', async () => {
    const cloneRes = await server.inject({ method: 'POST', url: `/api/v1/dishes/${originalId}/clone`, headers: auth(adminToken), payload: {} })
    const cloneId = cloneRes.json<{ id: string }>().id

    const ingRes = await server.inject({ method: 'GET', url: `/api/v1/dishes/${cloneId}/ingredients`, headers: auth(adminToken) })
    expect(ingRes.statusCode).toBe(200)
    const list = ingRes.json<{ ingredientId: string; baseQuantity: number; behavior: string }[]>()
    expect(list).toHaveLength(1)
    expect(list[0].ingredientId).toBe(ingredientId)
    expect(list[0].baseQuantity).toBe(150)
    expect(list[0].behavior).toBe('INCLUDED')
  })

  it('DI-19 — el clon es independiente del original', async () => {
    const cloneRes = await server.inject({ method: 'POST', url: `/api/v1/dishes/${originalId}/clone`, headers: auth(adminToken), payload: { name: 'Fugazzeta Independiente' } })
    const cloneId = cloneRes.json<{ id: string }>().id

    // Desactivar el original no afecta al clon
    await server.inject({ method: 'PATCH', url: `/api/v1/dishes/${originalId}/deactivate`, headers: auth(adminToken) })

    const cloneCheck = await server.inject({ method: 'GET', url: `/api/v1/dishes/${cloneId}`, headers: auth(adminToken) })
    expect(cloneCheck.json().active).toBe(true)
  })

  it('DI-20 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/dishes/no-existe/clone', headers: auth(adminToken), payload: {} })
    expect(res.statusCode).toBe(404)
  })

  it('DI-21 — 403 para CAJERO', async () => {
    const res = await server.inject({ method: 'POST', url: `/api/v1/dishes/${originalId}/clone`, headers: auth(cajeroToken), payload: {} })
    expect(res.statusCode).toBe(403)
  })
})
