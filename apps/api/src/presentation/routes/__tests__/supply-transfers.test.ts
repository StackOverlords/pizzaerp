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
  tenantSlug: 'test-supply-transfers-tenant',
  tenantSchema: 'tenant_test_dough_transfers',
  password: 'testpass123',
}

let server: FastifyInstance
let tenantId: string
let centralBranchId: string
let destinoBranchId: string
let adminToken: string
let adminDestToken: string
let cajeroToken: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'

  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash(TEST.password, 12)

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-supply-transfers' },
    update: {},
    create: { name: '_test-plan-supply-transfers' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Dough Transfers Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const central = await prisma.branch.upsert({
    where: { id: 'branch-dough-central-001' },
    update: {},
    create: { id: 'branch-dough-central-001', name: 'Sucursal Central', tenantId },
  })
  centralBranchId = central.id

  const destino = await prisma.branch.upsert({
    where: { id: 'branch-dough-destino-001' },
    update: {},
    create: { id: 'branch-dough-destino-001', name: 'Sucursal Destino', tenantId },
  })
  destinoBranchId = destino.id

  await prisma.user.upsert({
    where: { username_tenantId: { username: 'dough-cajero', tenantId } },
    update: {},
    create: { username: 'dough-cajero', passwordHash, role: 'CAJERO', tenantId, branchId: centralBranchId },
  })

  await tenantService.provision(TEST.tenantSchema)

  adminToken = server.jwt.sign({
    user_id: 'admin-dough-central',
    tenant_id: tenantId,
    branch_id: centralBranchId,
    role: UserRole.ADMIN,
    type: 'access',
  } satisfies JwtPayload)

  adminDestToken = server.jwt.sign({
    user_id: 'admin-dough-destino',
    tenant_id: tenantId,
    branch_id: destinoBranchId,
    role: UserRole.ADMIN,
    type: 'access',
  } satisfies JwtPayload)

  cajeroToken = server.jwt.sign({
    user_id: 'cajero-dough-central',
    tenant_id: tenantId,
    branch_id: centralBranchId,
    role: UserRole.CAJERO,
    type: 'access',
  } satisfies JwtPayload)

  for (const name of ['SMALL', 'MEDIUM', 'LARGE']) {
    await server.inject({
      method: 'POST',
      url: '/api/v1/supply-types',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name },
    })
  }
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-supply-transfers' } })
  await prisma.$disconnect()
  await server.close()
})

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── POST /api/v1/supply-transfers ─────────────────────────────────────────────

describe('POST /api/v1/supply-transfers', () => {
  it('DT-01 — ADMIN crea envío correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      headers: authHeader(adminToken),
      payload: {
        toBranchId: destinoBranchId,
        transferDate: '2026-04-30',
        items: [
          { supplyType: 'SMALL', quantitySent: 10 },
          { supplyType: 'LARGE', quantitySent: 5 },
        ],
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.status).toBe('IN_TRANSIT')
    expect(body.fromBranchId).toBe(centralBranchId)
    expect(body.toBranchId).toBe(destinoBranchId)
    expect(body.items).toHaveLength(2)
    expect(body.items[0].quantitySent).toBe(10)
  })

  it('DT-02 — falla si toBranchId es la misma sucursal origen', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      headers: authHeader(adminToken),
      payload: {
        toBranchId: centralBranchId,
        transferDate: '2026-04-30',
        items: [{ supplyType: 'SMALL', quantitySent: 5 }],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DT-03 — falla si items está vacío', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      headers: authHeader(adminToken),
      payload: {
        toBranchId: destinoBranchId,
        transferDate: '2026-04-30',
        items: [],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DT-04 — CAJERO no puede crear envíos (403)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      headers: authHeader(cajeroToken),
      payload: {
        toBranchId: destinoBranchId,
        transferDate: '2026-04-30',
        items: [{ supplyType: 'MEDIUM', quantitySent: 3 }],
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('DT-05 — sin token devuelve 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      payload: {
        toBranchId: destinoBranchId,
        transferDate: '2026-04-30',
        items: [{ supplyType: 'SMALL', quantitySent: 5 }],
      },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /api/v1/supply-transfers ──────────────────────────────────────────────

describe('GET /api/v1/supply-transfers', () => {
  it('DT-06 — sucursal destino ve envíos IN_TRANSIT dirigidos a ella', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-transfers?status=IN_TRANSIT',
      headers: authHeader(adminDestToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0].status).toBe('IN_TRANSIT')
    expect(body[0].toBranchId).toBe(destinoBranchId)
  })

  it('DT-07 — sucursal origen ve sus envíos salientes', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-transfers',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0].fromBranchId).toBe(centralBranchId)
  })

  it('DT-08 — sin token devuelve 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-transfers',
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── PATCH /api/v1/supply-transfers/:id/receive ────────────────────────────────

describe('PATCH /api/v1/supply-transfers/:id/receive', () => {
  let transferId: string

  beforeAll(async () => {
    // Crear un envío fresco para los tests de recepción
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        toBranchId: destinoBranchId,
        transferDate: '2026-04-30',
        items: [
          { supplyType: 'SMALL', quantitySent: 10 },
          { supplyType: 'MEDIUM', quantitySent: 6 },
        ],
      },
    })
    transferId = res.json().id
  })

  it('DT-09 — ADMIN destino confirma recepción sin diferencias', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/supply-transfers/${transferId}/receive`,
      headers: authHeader(adminDestToken),
      payload: {
        items: [
          { supplyType: 'SMALL', quantityReceived: 10 },
          { supplyType: 'MEDIUM', quantityReceived: 6 },
        ],
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('RECEIVED')
    expect(body.receivedAt).toBeDefined()
    const smallItem = body.items.find((i: { supplyType: string }) => i.supplyType === 'SMALL')
    expect(smallItem.quantityReceived).toBe(10)
  })

  it('DT-10 — falla si se intenta confirmar un envío ya recibido (400)', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/supply-transfers/${transferId}/receive`,
      headers: authHeader(adminDestToken),
      payload: {
        items: [{ supplyType: 'SMALL', quantityReceived: 10 }],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DT-11 — falla si hay diferencia y no se provee observación (400)', async () => {
    const res2 = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      headers: authHeader(adminToken),
      payload: {
        toBranchId: destinoBranchId,
        transferDate: '2026-04-30',
        items: [{ supplyType: 'LARGE', quantitySent: 8 }],
      },
    })
    const newId = res2.json().id

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/supply-transfers/${newId}/receive`,
      headers: authHeader(adminDestToken),
      payload: {
        items: [{ supplyType: 'LARGE', quantityReceived: 5 }],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DT-12 — con diferencia y observación confirma correctamente', async () => {
    const res2 = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      headers: authHeader(adminToken),
      payload: {
        toBranchId: destinoBranchId,
        transferDate: '2026-04-30',
        items: [{ supplyType: 'LARGE', quantitySent: 8 }],
      },
    })
    const newId = res2.json().id

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/supply-transfers/${newId}/receive`,
      headers: authHeader(adminDestToken),
      payload: {
        items: [{ supplyType: 'LARGE', quantityReceived: 5 }],
        notes: 'Se rompieron 3 masas en el transporte',
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('RECEIVED')
    expect(body.notes).toBe('Se rompieron 3 masas en el transporte')
  })

  it('DT-13 — sucursal origen no puede confirmar recepción de otro (403)', async () => {
    const res2 = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-transfers',
      headers: authHeader(adminToken),
      payload: {
        toBranchId: destinoBranchId,
        transferDate: '2026-04-30',
        items: [{ supplyType: 'SMALL', quantitySent: 3 }],
      },
    })
    const newId = res2.json().id

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/supply-transfers/${newId}/receive`,
      headers: authHeader(adminToken),
      payload: {
        items: [{ supplyType: 'SMALL', quantityReceived: 3 }],
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('DT-14 — transfer inexistente devuelve 404', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/supply-transfers/non-existent/receive',
      headers: authHeader(adminDestToken),
      payload: {
        items: [{ supplyType: 'SMALL', quantityReceived: 5 }],
      },
    })
    expect(res.statusCode).toBe(404)
  })
})
