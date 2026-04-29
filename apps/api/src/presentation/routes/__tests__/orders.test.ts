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
  tenantSlug: 'test-orders-tenant',
  tenantSchema: 'tenant_test_orders',
  username: 'orders-cajero',
  password: 'testpass123',
}

let server: FastifyInstance
let tenantId: string
let branchId: string
let cajeroToken: string
let cajeroUserId: string
let dishId: string
let shiftId: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'

  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash(TEST.password, 12)

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-orders' },
    update: {},
    create: { name: '_test-plan-orders' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Orders Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-orders-test-001' },
    update: {},
    create: { id: 'branch-orders-test-001', name: 'Branch Test Orders', tenantId },
  })
  branchId = branch.id

  const user = await prisma.user.upsert({
    where: { username_tenantId: { username: TEST.username, tenantId } },
    update: {},
    create: { username: TEST.username, passwordHash, role: 'CAJERO', tenantId, branchId },
  })
  cajeroUserId = user.id

  await tenantService.provision(TEST.tenantSchema)

  cajeroToken = server.jwt.sign({
    user_id: cajeroUserId,
    tenant_id: tenantId,
    branch_id: branchId,
    role: UserRole.CAJERO,
    type: 'access',
  } satisfies JwtPayload)

  // Crear un platillo de prueba en el schema del tenant
  const dishRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO "${TEST.tenantSchema}".dishes (name, sale_price, active)
     VALUES ('Pizza Margarita', 55.00, true)
     RETURNING id`,
  )
  dishId = dishRows[0].id

  // Abrir turno para el cajero
  const shiftRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO "${TEST.tenantSchema}".shifts (branch_id, user_id, initial_cash)
     VALUES ($1, $2, 200)
     RETURNING id`,
    branchId,
    cajeroUserId,
  )
  shiftId = shiftRows[0].id
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-orders' } })
  await prisma.$disconnect()
  await server.close()
})

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── POST /orders ─────────────────────────────────────────────────────────────

describe('POST /api/v1/orders', () => {
  it('OR-01 — CAJERO crea pedido con un ítem correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: {
        items: [{ dishId, quantity: 2 }],
        notes: 'sin cebolla',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.orderNumber).toBe(1)
    expect(body.shiftId).toBe(shiftId)
    expect(body.status).toBe('PENDING')
    expect(body.subtotal).toBe(110)
    expect(body.total).toBe(110)
    expect(body.notes).toBe('sin cebolla')
    expect(body.items).toHaveLength(1)
    expect(body.items[0].dishName).toBe('Pizza Margarita')
    expect(body.items[0].unitPrice).toBe(55)
    expect(body.items[0].quantity).toBe(2)
    expect(body.items[0].subtotal).toBe(110)
  })

  it('OR-02 — segundo pedido incrementa orderNumber', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 1 }] },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().orderNumber).toBe(2)
  })

  it('OR-03 — devuelve 400 si items está vacío', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('OR-04 — devuelve 400 si quantity < 1', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 0 }] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('OR-05 — devuelve 400 si dishId no existe', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId: 'non-existent', quantity: 1 }] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('OR-06 — devuelve 401 sin token', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      payload: { items: [{ dishId, quantity: 1 }] },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /orders/:id ─────────────────────────────────────────────────────────

describe('GET /api/v1/orders/:id', () => {
  let orderId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 3 }] },
    })
    orderId = res.json<{ id: string }>().id
  })

  it('OR-07 — retorna el pedido con sus ítems', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}`,
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(orderId)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].quantity).toBe(3)
  })

  it('OR-08 — devuelve 404 para ID inexistente', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders/non-existent-id',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(404)
  })
})
