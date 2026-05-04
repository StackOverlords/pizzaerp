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
  tenantSlug: 'test-dough-closings-tenant',
  tenantSchema: 'tenant_test_dough_closings',
  password: 'testpass123',
  closureDate: new Date().toISOString().split('T')[0],
}

let server: FastifyInstance
let tenantId: string
let branchId: string
let sourceBranchId: string
let adminToken: string
let cajeroToken: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'

  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash(TEST.password, 12)

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-dough-closings' },
    update: {},
    create: { name: '_test-plan-dough-closings' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Dough Closings Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-closing-dest-001' },
    update: {},
    create: { id: 'branch-closing-dest-001', name: 'Branch Closing Dest', tenantId },
  })
  branchId = branch.id

  const source = await prisma.branch.upsert({
    where: { id: 'branch-closing-src-001' },
    update: {},
    create: { id: 'branch-closing-src-001', name: 'Branch Closing Source', tenantId },
  })
  sourceBranchId = source.id

  await prisma.user.upsert({
    where: { username_tenantId: { username: 'closing-cajero', tenantId } },
    update: {},
    create: { username: 'closing-cajero', passwordHash, role: 'CAJERO', tenantId, branchId },
  })

  await tenantService.provision(TEST.tenantSchema)

  adminToken = server.jwt.sign({
    user_id: 'admin-closing-test',
    tenant_id: tenantId,
    branch_id: branchId,
    role: UserRole.ADMIN,
    type: 'access',
  } satisfies JwtPayload)

  cajeroToken = server.jwt.sign({
    user_id: 'cajero-closing-test',
    tenant_id: tenantId,
    branch_id: branchId,
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

  // Seed: crear envío recibido para tener initial_count
  const transferRes = await server.inject({
    method: 'POST',
    url: '/api/v1/supply-transfers',
    headers: { Authorization: `Bearer ${server.jwt.sign({
      user_id: 'admin-closing-source',
      tenant_id: tenantId,
      branch_id: sourceBranchId,
      role: UserRole.ADMIN,
      type: 'access',
    } satisfies JwtPayload)}` },
    payload: {
      toBranchId: branchId,
      transferDate: TEST.closureDate,
      items: [
        { supplyType: 'SMALL', quantitySent: 20 },
        { supplyType: 'MEDIUM', quantitySent: 10 },
      ],
    },
  })
  const transferId = transferRes.json().id

  await server.inject({
    method: 'PATCH',
    url: `/api/v1/supply-transfers/${transferId}/receive`,
    headers: { Authorization: `Bearer ${adminToken}` },
    payload: {
      items: [
        { supplyType: 'SMALL', quantityReceived: 20 },
        { supplyType: 'MEDIUM', quantityReceived: 10 },
      ],
    },
  })

  // Seed: registrar 2 mermas de SMALL
  await server.inject({
    method: 'POST',
    url: '/api/v1/supply-wastages',
    headers: { Authorization: `Bearer ${adminToken}` },
    payload: { supplyType: 'SMALL', quantity: 2, reason: 'FELL' },
  })
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-dough-closings' } })
  await prisma.$disconnect()
  await server.close()
})

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── GET /api/v1/supply-closings/summary ───────────────────────────────────────

describe('GET /api/v1/supply-closings/summary', () => {
  it('DC-01 — devuelve initial_count y wastage_count calculados del día', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/supply-closings/summary?date=${TEST.closureDate}`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    const small = body.find((s: { supplyType: string }) => s.supplyType === 'SMALL')
    expect(small.initialCount).toBe(20)
    expect(small.wastageCount).toBe(2)
  })

  it('DC-02 — CAJERO no puede ver el summary (403)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/supply-closings/summary?date=${TEST.closureDate}`,
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(403)
  })
})

// ─── POST /api/v1/supply-closings ──────────────────────────────────────────────

describe('POST /api/v1/supply-closings', () => {
  it('DC-03 — ADMIN cierra SMALL sin diferencia', async () => {
    // initial=20, wastage=2, sold=15 → theoretical=3; actual=3 → diff=0
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-closings',
      headers: authHeader(adminToken),
      payload: {
        closureDate: TEST.closureDate,
        supplyType: 'SMALL',
        soldCount: 15,
        actualRemaining: 3,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.initialCount).toBe(20)
    expect(body.wastageCount).toBe(2)
    expect(body.soldCount).toBe(15)
    expect(body.theoreticalRemaining).toBe(3)
    expect(body.actualRemaining).toBe(3)
    expect(body.difference).toBe(0)
  })

  it('DC-04 — diferencia sin notas devuelve 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-closings',
      headers: authHeader(adminToken),
      payload: {
        closureDate: TEST.closureDate,
        supplyType: 'MEDIUM',
        soldCount: 8,
        actualRemaining: 1,  // theoretical=2, diff=-1
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DC-05 — diferencia con notas cierra correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-closings',
      headers: authHeader(adminToken),
      payload: {
        closureDate: TEST.closureDate,
        supplyType: 'MEDIUM',
        soldCount: 8,
        actualRemaining: 1,
        notes: 'Falta una masa, se revisará con el repartidor',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.difference).toBe(-1)
    expect(body.notes).toBeDefined()
  })

  it('DC-06 — no puede cerrar el mismo tipo dos veces (409)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-closings',
      headers: authHeader(adminToken),
      payload: {
        closureDate: TEST.closureDate,
        supplyType: 'SMALL',
        soldCount: 15,
        actualRemaining: 3,
      },
    })
    expect(res.statusCode).toBe(409)
  })

  it('DC-07 — CAJERO no puede cerrar (403)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-closings',
      headers: authHeader(cajeroToken),
      payload: {
        closureDate: TEST.closureDate,
        supplyType: 'LARGE',
        soldCount: 0,
        actualRemaining: 0,
      },
    })
    expect(res.statusCode).toBe(403)
  })
})

// ─── GET /api/v1/supply-closings ───────────────────────────────────────────────

describe('GET /api/v1/supply-closings', () => {
  it('DC-08 — lista historial de cierres de la sucursal', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-closings',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0].branchId).toBe(branchId)
  })

  it('DC-09 — sin token devuelve 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-closings',
    })
    expect(res.statusCode).toBe(401)
  })
})
