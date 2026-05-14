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
let adminNoBranchToken: string
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

  adminNoBranchToken = server.jwt.sign({
    user_id: 'admin-orders-nobranch',
    tenant_id: tenantId,
    branch_id: null,
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

// ─── PATCH /orders/:id/discount ───────────────────────────────────────────────

describe('PATCH /api/v1/orders/:id/discount', () => {
  const ADMIN_PIN = '1234'
  let discountOrderId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 2 }] },  // total = 110
    })
    discountOrderId = res.json<{ id: string }>().id
  })

  it('OR-20 — aplica descuento por AMOUNT correctamente', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${discountOrderId}/discount`,
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: ADMIN_PIN, type: 'AMOUNT', value: 10, reason: 'cliente frecuente' },
    })
    expect(res.statusCode).toBe(200)
    const { order, discount } = res.json()
    expect(order.discountAmount).toBe(10)
    expect(order.total).toBe(100)   // 110 - 10
    expect(discount.type).toBe('AMOUNT')
    expect(discount.value).toBe(10)
    expect(discount.amount).toBe(10)
    expect(discount.reason).toBe('cliente frecuente')
  })

  it('OR-21 — aplica descuento por PERCENTAGE correctamente', async () => {
    const newOrder = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 2 }] },  // total = 110
    })
    const id = newOrder.json<{ id: string }>().id

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${id}/discount`,
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: ADMIN_PIN, type: 'PERCENTAGE', value: 10 },
    })
    expect(res.statusCode).toBe(200)
    const { order, discount } = res.json()
    expect(order.discountAmount).toBeCloseTo(11)   // 10% de 110
    expect(order.total).toBeCloseTo(99)
    expect(discount.type).toBe('PERCENTAGE')
    expect(discount.value).toBe(10)
    expect(discount.amount).toBeCloseTo(11)
  })

  it('OR-22 — devuelve 400 si el descuento supera el total', async () => {
    const newOrder = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
      payload: { items: [{ dishId, quantity: 1 }] },  // total = 55
    })
    const id = newOrder.json<{ id: string }>().id

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${id}/discount`,
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: ADMIN_PIN, type: 'AMOUNT', value: 100 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('OR-23 — devuelve 401 si el PIN es incorrecto', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/orders/${discountOrderId}/discount`,
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: '9999', type: 'AMOUNT', value: 5 },
    })
    expect(res.statusCode).toBe(401)
  })

  it('OR-24 — devuelve 404 para pedido inexistente', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/orders/non-existent/discount',
      headers: authHeader(cajeroToken),
      payload: { adminUsername, adminPin: ADMIN_PIN, type: 'AMOUNT', value: 5 },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── GET /orders ──────────────────────────────────────────────────────────────

describe('GET /api/v1/orders', () => {
  // IDs de las órdenes sembradas para estos tests
  let olOrderIds: string[] = []
  let olShiftId2: string
  let branch2Id: string
  let admin2Id: string

  beforeAll(async () => {
    // Crear segunda sucursal para tests de admin cross-branch
    const branch2 = await prisma.branch.upsert({
      where: { id: 'branch-orders-test-002' },
      update: {},
      create: { id: 'branch-orders-test-002', name: 'Branch Test Orders 2', tenantId },
    })
    branch2Id = branch2.id

    // Crear admin con acceso a todo el tenant (sin branch fija en JWT)
    const admin2 = await prisma.user.upsert({
      where: { username_tenantId: { username: 'orders-admin2', tenantId } },
      update: {},
      create: {
        username: 'orders-admin2',
        passwordHash: 'x',
        role: 'ADMIN',
        tenantId,
        branchId: null,
      },
    })
    admin2Id = admin2.id

    // Abrir turno 2 en la sucursal principal (para test de filtro por shiftId)
    const shift2Rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${TEST.tenantSchema}".shifts (branch_id, user_id, initial_cash)
       VALUES ($1, $2, 0)
       RETURNING id`,
      branchId,
      cajeroUserId,
    )
    olShiftId2 = shift2Rows[0].id

    // Seed: 3 PENDING en turno principal (shiftId), 2 PAID, 1 CANCELLED
    //       1 PENDING en turno 2 (olShiftId2)
    //       1 PENDING en branch2 (para test de admin cross-branch)

    const orderPayloads = [
      // turno 1, branch1 — PENDING x3
      { shiftId, status: 'PENDING', note: 'ol-01' },
      { shiftId, status: 'PENDING', note: 'ol-02' },
      { shiftId, status: 'PENDING', note: 'ol-03' },
      // turno 1, branch1 — PAID x2
      { shiftId, status: 'PAID', note: 'ol-04' },
      { shiftId, status: 'PAID', note: 'ol-05' },
      // turno 1, branch1 — CANCELLED x1
      { shiftId, status: 'CANCELLED', note: 'ol-06' },
      // turno 2, branch1 — PENDING x1
      { shiftId: olShiftId2, status: 'PENDING', note: 'ol-07' },
    ]

    for (const o of orderPayloads) {
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${TEST.tenantSchema}".orders
           (order_number, shift_id, branch_id, user_id, subtotal, discount_amount, total, status, notes)
         VALUES (
           (SELECT COALESCE(MAX(order_number),0)+1 FROM "${TEST.tenantSchema}".orders WHERE branch_id = $1 AND created_at::date = CURRENT_DATE),
           $2, $1, $3, 55.00, 0, 55.00, $4, $5
         )
         RETURNING id`,
        branchId,
        o.shiftId,
        cajeroUserId,
        o.status,
        o.note,
      )
      olOrderIds.push(rows[0].id)
    }

    // 1 orden en branch2 (para test OL-09 admin cross-branch)
    // branch2 necesita su propio turno
    const branch2ShiftRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${TEST.tenantSchema}".shifts (branch_id, user_id, initial_cash)
       VALUES ($1, $2, 0)
       RETURNING id`,
      branch2Id,
      cajeroUserId,
    )
    const branch2ShiftId = branch2ShiftRows[0].id

    const branch2OrderRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${TEST.tenantSchema}".orders
         (order_number, shift_id, branch_id, user_id, subtotal, discount_amount, total, status, notes)
       VALUES (1, $1, $2, $3, 75.00, 0, 75.00, 'PENDING', 'branch2-order')
       RETURNING id`,
      branch2ShiftId,
      branch2Id,
      cajeroUserId,
    )
    olOrderIds.push(branch2OrderRows[0].id)
  })

  afterAll(async () => {
    // Cleanup de branch2 (branch1 y sus datos son limpiados en el afterAll global)
    await prisma.branch.deleteMany({ where: { id: branch2Id } })
    await prisma.user.deleteMany({ where: { id: admin2Id } })
  })

  it('OL-01 — CAJERO sin filtros → 200, data array con órdenes de su branch', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
    expect(typeof body.total).toBe('number')
    // Todas las órdenes deben ser de la branch del cajero
    for (const order of body.data) {
      expect(order.branchId).toBe(branchId)
    }
    // No debe contener la orden de branch2
    const ids = body.data.map((o: { id: string }) => o.id)
    expect(ids).not.toContain(olOrderIds[olOrderIds.length - 1])
  })

  it('OL-02 — CAJERO pasa ?branchId=otro → 403', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/orders?branchId=${branch2Id}`,
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(403)
  })

  it('OL-03 — CAJERO pasa ?userId=alguien → 403', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/orders?userId=${cajeroUserId}`,
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(403)
  })

  it('OL-04 — CAJERO ?status=PAID → solo órdenes pagadas', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders?status=PAID',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
    for (const order of body.data) {
      expect(order.status).toBe('PAID')
    }
  })

  it('OL-05 — CAJERO ?shiftId={olShiftId2} → solo órdenes de ese turno', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/orders?shiftId=${olShiftId2}`,
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
    for (const order of body.data) {
      expect(order.shiftId).toBe(olShiftId2)
    }
  })

  it('OL-06 — Paginación: page=1&limit=2 y page=2&limit=2 → sin duplicados', async () => {
    const res1 = await server.inject({
      method: 'GET',
      url: '/api/v1/orders?page=1&limit=2',
      headers: authHeader(cajeroToken),
    })
    expect(res1.statusCode).toBe(200)
    const body1 = res1.json()
    expect(body1.data).toHaveLength(2)
    expect(body1.page).toBe(1)
    expect(body1.limit).toBe(2)

    const res2 = await server.inject({
      method: 'GET',
      url: '/api/v1/orders?page=2&limit=2',
      headers: authHeader(cajeroToken),
    })
    expect(res2.statusCode).toBe(200)
    const body2 = res2.json()
    expect(body2.data).toHaveLength(2)
    expect(body2.page).toBe(2)

    const ids1 = body1.data.map((o: { id: string }) => o.id)
    const ids2 = body2.data.map((o: { id: string }) => o.id)
    const overlap = ids1.filter((id: string) => ids2.includes(id))
    expect(overlap).toHaveLength(0)
  })

  it('OL-07 — Sort: ?sortBy=orderNumber&sortOrder=asc → orden ascendente', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders?sortBy=orderNumber&sortOrder=asc',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    const numbers: number[] = body.data.map((o: { orderNumber: number }) => o.orderNumber)
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i - 1])
    }
  })

  it('OL-08 — ADMIN ?userId={cajeroId} → solo órdenes de ese usuario', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/orders?userId=${cajeroUserId}`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
    for (const order of body.data) {
      expect(order.userId).toBe(cajeroUserId)
    }
  })

  it('OL-09 — ADMIN ?branchId={branch2Id} → solo órdenes de esa sucursal', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/orders?branchId=${branch2Id}`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
    for (const order of body.data) {
      expect(order.branchId).toBe(branch2Id)
    }
  })

  it('OL-10 — Sin token → 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders',
    })
    expect(res.statusCode).toBe(401)
  })

  it('OL-11 — ?from=hoy&to=hoy → datos no vacíos', async () => {
    const today = new Date().toISOString().split('T')[0]
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/orders?from=${today}&to=${today}`,
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
  })

  it('OL-12 — ?sortBy=invalido → 400', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders?sortBy=invalido',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(400)
  })

  it('OL-13 — ?from=2030-05-15&to=2030-05-10 (from > to) → 400', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders?from=2030-05-15&to=2030-05-10',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(400)
  })

  it('OL-14 — ?limit=101 → 400', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders?limit=101',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(400)
  })

  it('OL-15 — ?page=0 → 400', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/orders?page=0',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(400)
  })
})


// ─── POST /orders — ADMIN branch override ────────────────────────────────────

describe('POST /api/v1/orders — ADMIN branch override', () => {
  it('OR-A1 — ADMIN sin branch en JWT + body.branchId → no devuelve 400 de sucursal faltante', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { Authorization: `Bearer ${adminNoBranchToken}` },
      payload: { items: [{ dishId, quantity: 1 }], branchId },
    })
    // Branch resolution succeeded — may fail for another reason (no open shift for admin user)
    // but must NOT be 400 'Debe seleccionar una sucursal'
    if (res.statusCode === 400) {
      expect(res.json().message).not.toBe('Debe seleccionar una sucursal')
    }
  })

  it('OR-A2 — ADMIN sin branch en JWT y sin body.branchId → 400 con mensaje correcto', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { Authorization: `Bearer ${adminNoBranchToken}` },
      payload: { items: [{ dishId, quantity: 1 }] },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Debe seleccionar una sucursal')
  })

  it('OR-A3 — CAJERO con body.branchId → usa branch del JWT (branchId en orden = JWT branch)', async () => {
    const otherBranchId = 'branch-orders-other-999'
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { Authorization: `Bearer ${cajeroToken}` },
      payload: { items: [{ dishId, quantity: 1 }], branchId: otherBranchId },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().branchId).toBe(branchId) // JWT branch, not body
  })

  it('OR-A4 — ADMIN con branch en JWT + body.branchId → JWT gana, no devuelve 400 de sucursal', async () => {
    const otherBranchId = 'branch-orders-other-888'
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { items: [{ dishId, quantity: 1 }], branchId: otherBranchId },
    })
    // JWT branch was used (admin with branchId in JWT) — may fail for other reason but not 'no branch'
    if (res.statusCode === 400) {
      expect(res.json().message).not.toBe('Debe seleccionar una sucursal')
    }
  })
})
