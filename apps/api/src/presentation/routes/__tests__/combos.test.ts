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

const TEST = { tenantSlug: 'test-combos-tenant', tenantSchema: 'tenant_test_combos' }

let server: FastifyInstance
let tenantId: string
let branchId: string
let adminToken: string
let cajeroToken: string
let dishId: string
let dish2Id: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash('testpass', 12)
  const plan = await prisma.plan.upsert({ where: { name: '_test-plan-combos' }, update: {}, create: { name: '_test-plan-combos' } })
  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: { name: 'Combos Test', slug: TEST.tenantSlug, schema: TEST.tenantSchema, status: 'ACTIVE', subscription: { create: { planId: plan.id, status: 'ACTIVE' } } },
  })
  tenantId = tenant.id
  const branch = await prisma.branch.upsert({ where: { id: 'branch-combos-001' }, update: {}, create: { id: 'branch-combos-001', name: 'Branch', tenantId } })
  branchId = branch.id
  await prisma.user.upsert({ where: { username_tenantId: { username: 'combo-admin', tenantId } }, update: {}, create: { username: 'combo-admin', passwordHash, role: 'ADMIN', tenantId, branchId } })
  await tenantService.provision(TEST.tenantSchema)

  const base: JwtPayload = { user_id: 'u1', tenant_id: tenantId, branch_id: branchId, role: UserRole.ADMIN, type: 'access' }
  adminToken = server.jwt.sign(base)
  cajeroToken = server.jwt.sign({ ...base, role: UserRole.CAJERO } satisfies JwtPayload)

  function auth(t: string) { return { Authorization: `Bearer ${t}` } }
  const d1 = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { name: 'Margherita', salePrice: 1500 } })
  dishId = d1.json<{ id: string }>().id
  const d2 = await server.inject({ method: 'POST', url: '/api/v1/dishes', headers: auth(adminToken), payload: { name: 'Napolitana', salePrice: 1600 } })
  dish2Id = d2.json<{ id: string }>().id
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-combos' } })
  await prisma.$disconnect()
  await server.close()
})

function auth(t: string) { return { Authorization: `Bearer ${t}` } }
const baseCombo = { name: 'Combo Familiar', salePrice: 3000 }

// ─── Combos ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/combos', () => {
  it('CB-01 — ADMIN crea combo', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/combos', headers: auth(adminToken), payload: { ...baseCombo, availableFrom: '12:00:00', availableTo: '23:00:00' } })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Combo Familiar')
    expect(body.salePrice).toBe(3000)
    expect(body.availableFrom).toBe('12:00:00')
    expect(body.active).toBe(true)
  })

  it('CB-02 — 403 para CAJERO', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/combos', headers: auth(cajeroToken), payload: baseCombo })
    expect(res.statusCode).toBe(403)
  })

  it('CB-03 — 400 si salePrice <= 0', async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/combos', headers: auth(adminToken), payload: { ...baseCombo, salePrice: -1 } })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/v1/combos y GET /:id', () => {
  let comboId: string

  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/combos', headers: auth(adminToken), payload: { name: 'Combo Duo', salePrice: 2000 } })
    comboId = res.json<{ id: string }>().id
  })

  it('CB-04 — lista combos', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/combos', headers: auth(cajeroToken) })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('CB-05 — GET /:id devuelve slots vacíos inicialmente', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/combos/${comboId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().slots).toEqual([])
  })

  it('CB-06 — 404 para ID inexistente', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/combos/no-existe', headers: auth(adminToken) })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Slots ────────────────────────────────────────────────────────────────────

describe('Slots de combo', () => {
  let comboId: string
  let slotId: string

  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/combos', headers: auth(adminToken), payload: { name: 'Combo Slots Test', salePrice: 1500 } })
    comboId = res.json<{ id: string }>().id
  })

  it('CB-07 — agrega slot al combo', async () => {
    const res = await server.inject({ method: 'POST', url: `/api/v1/combos/${comboId}/slots`, headers: auth(adminToken), payload: { name: 'Elegí tu pizza', required: true, orderIndex: 0 } })
    expect(res.statusCode).toBe(201)
    slotId = res.json<{ id: string }>().id
    expect(res.json().comboId).toBe(comboId)
    expect(res.json().required).toBe(true)
  })

  it('CB-08 — GET /:id incluye slots', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/combos/${comboId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    const combo = res.json<{ slots: { id: string }[] }>()
    expect(combo.slots.length).toBe(1)
    expect(combo.slots[0].id).toBe(slotId)
  })

  it('CB-09 — actualiza slot', async () => {
    const res = await server.inject({ method: 'PUT', url: `/api/v1/combos/${comboId}/slots/${slotId}`, headers: auth(adminToken), payload: { name: 'Elegí tu pizza grande', required: false, orderIndex: 1 } })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Elegí tu pizza grande')
    expect(res.json().required).toBe(false)
  })

  it('CB-10 — agrega opciones al slot', async () => {
    const r1 = await server.inject({ method: 'POST', url: `/api/v1/combos/${comboId}/slots/${slotId}/options`, headers: auth(adminToken), payload: { dishId } })
    expect(r1.statusCode).toBe(201)
    expect(r1.json().dishId).toBe(dishId)

    const r2 = await server.inject({ method: 'POST', url: `/api/v1/combos/${comboId}/slots/${slotId}/options`, headers: auth(adminToken), payload: { dishId: dish2Id } })
    expect(r2.statusCode).toBe(201)
  })

  it('CB-11 — GET /:id incluye opciones en slots', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/combos/${comboId}`, headers: auth(adminToken) })
    const combo = res.json<{ slots: { options: { dishId: string }[] }[] }>()
    expect(combo.slots[0].options.length).toBe(2)
  })

  it('CB-12 — 409 si el platillo ya es opción del slot', async () => {
    const res = await server.inject({ method: 'POST', url: `/api/v1/combos/${comboId}/slots/${slotId}/options`, headers: auth(adminToken), payload: { dishId } })
    expect(res.statusCode).toBe(409)
  })

  it('CB-13 — elimina opción del slot', async () => {
    const res = await server.inject({ method: 'DELETE', url: `/api/v1/combos/${comboId}/slots/${slotId}/options/${dish2Id}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(204)
  })

  it('CB-14 — elimina slot (y sus opciones) — 204', async () => {
    const res = await server.inject({ method: 'DELETE', url: `/api/v1/combos/${comboId}/slots/${slotId}`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(204)
  })

  it('CB-15 — GET /:id tras eliminar slot queda vacío', async () => {
    const res = await server.inject({ method: 'GET', url: `/api/v1/combos/${comboId}`, headers: auth(adminToken) })
    expect(res.json<{ slots: unknown[] }>().slots).toHaveLength(0)
  })
})

// ─── Deactivate ───────────────────────────────────────────────────────────────

describe('PATCH /api/v1/combos/:id/deactivate', () => {
  let comboId: string

  beforeAll(async () => {
    const res = await server.inject({ method: 'POST', url: '/api/v1/combos', headers: auth(adminToken), payload: { name: 'Combo Para Desactivar', salePrice: 500 } })
    comboId = res.json<{ id: string }>().id
  })

  it('CB-16 — desactiva combo', async () => {
    const res = await server.inject({ method: 'PATCH', url: `/api/v1/combos/${comboId}/deactivate`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().active).toBe(false)
  })

  it('CB-17 — 409 si ya está inactivo', async () => {
    const res = await server.inject({ method: 'PATCH', url: `/api/v1/combos/${comboId}/deactivate`, headers: auth(adminToken) })
    expect(res.statusCode).toBe(409)
  })
})
