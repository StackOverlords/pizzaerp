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
let adminToken: string
let adminUsername: string
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

  // Crear admin para tests de cancelación
  adminUsername = 'orders-admin'
  const admin = await prisma.user.upsert({
    where: { username_tenantId: { username: adminUsername, tenantId } },
    update: {},
    create: { username: adminUsername, passwordHash, role: 'ADMIN', tenantId, branchId },
  })
  adminToken = server.jwt.sign({
    user_id: admin.id,
    tenant_id: tenantId,
    branch_id: branchId,
    role: UserRole.ADMIN,
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

// ─── PATCH /orders/:id/pay ────────────────────────────────────────────────────

describe('PATCH /api/v1/orders/:id/pay', () => {
  let cashOrderId: string
  let qrOrderId: string

  beforeAll(async () => {
    const r1 = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 1 }] },
    })
    cashOrderId = r1.json<{ id: string }>().id

    const r2 = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 2 }] },
    })
    qrOrderId = r2.json<{ id: string }>().id
  })

  it('OR-09 — pago en efectivo con vuelto correcto', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${cashOrderId}/pay`,
      headers: authHeader(cajeroToken),
      payload: { method: 'CASH', amount: 100 },
    })
    expect(res.statusCode).toBe(200)
    const { order, payment } = res.json()
    expect(order.status).toBe('PAID')
    expect(payment.method).toBe('CASH')
    expect(payment.amount).toBe(100)
    expect(payment.changeAmount).toBe(45)   // 100 - 55
    expect(payment.changeAmount).toBeCloseTo(100 - 55)
  })

  it('OR-10 — pago QR con referencia', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${qrOrderId}/pay`,
      headers: authHeader(cajeroToken),
      payload: { method: 'QR', reference: 'REF-001' },
    })
    expect(res.statusCode).toBe(200)
    const { order, payment } = res.json()
    expect(order.status).toBe('PAID')
    expect(payment.method).toBe('QR')
    expect(payment.amount).toBe(110)   // total del pedido
    expect(payment.changeAmount).toBeNull()
    expect(payment.reference).toBe('REF-001')
  })

  it('OR-11 — devuelve 409 si el pedido ya está pagado', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${cashOrderId}/pay`,
      headers: authHeader(cajeroToken),
      payload: { method: 'CASH', amount: 100 },
    })
    expect(res.statusCode).toBe(409)
  })

  it('OR-12 — devuelve 400 si monto CASH es menor al total', async () => {
    const newOrder = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 1 }] },
    })
    const id = newOrder.json<{ id: string }>().id

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${id}/pay`,
      headers: authHeader(cajeroToken),
      payload: { method: 'CASH', amount: 10 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('OR-13 — devuelve 400 si falta amount para CASH', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${cashOrderId}/pay`,
      headers: authHeader(cajeroToken),
      payload: { method: 'CASH' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('OR-14 — devuelve 404 para pedido inexistente', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/orders/non-existent/pay',
      headers: authHeader(cajeroToken),
      payload: { method: 'QR' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── PATCH /auth/pin + PATCH /orders/:id/cancel ───────────────────────────────

describe('PATCH /api/v1/orders/:id/cancel', () => {
  const ADMIN_PIN = '1234'
  let pendingOrderId: string

  beforeAll(async () => {
    // Admin configura su PIN
    await server.inject({
      method: 'PATCH',
      url: '/api/v1/auth/pin',
      headers: authHeader(adminToken),
      payload: { pin: ADMIN_PIN },
    })

    // Crear pedido PENDING para cancelar
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 1 }] },
    })
    pendingOrderId = res.json<{ id: string }>().id
  })

  it('OR-15 — cajero cancela pedido con PIN válido', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${pendingOrderId}/cancel`,
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: ADMIN_PIN, reason: 'Cliente se arrepintió' },
    })
    expect(res.statusCode).toBe(200)
    const { order, cancellation } = res.json()
    expect(order.status).toBe('CANCELLED')
    expect(cancellation.reason).toBe('Cliente se arrepintió')
    expect(cancellation.cajeroUserId).toBe(cajeroUserId)
  })

  it('OR-16 — devuelve 409 si el pedido ya está cancelado', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${pendingOrderId}/cancel`,
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: ADMIN_PIN },
    })
    expect(res.statusCode).toBe(409)
  })

  it('OR-17 — devuelve 401 si el PIN es incorrecto', async () => {
    const newOrder = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 1 }] },
    })
    const id = newOrder.json<{ id: string }>().id

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${id}/cancel`,
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: '9999' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('OR-18 — devuelve 400 si el admin no tiene PIN configurado', async () => {
    // Crear otro admin sin PIN
    const noPinAdmin = await prisma.user.upsert({
      where: { username_tenantId: { username: 'admin-no-pin', tenantId } },
      update: {},
      create: { username: 'admin-no-pin', passwordHash: 'x', role: 'ADMIN', tenantId, branchId },
    })

    const newOrder = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 1 }] },
    })
    const id = newOrder.json<{ id: string }>().id

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${id}/cancel`,
      headers: authHeader(cajeroToken),
      payload: { adminUsername: noPinAdmin.username, adminPin: '1234' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('OR-19 — devuelve 404 para pedido inexistente', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/orders/non-existent/cancel',
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: ADMIN_PIN },
    })
    expect(res.statusCode).toBe(404)
  })
})
