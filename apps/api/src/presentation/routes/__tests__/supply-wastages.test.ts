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
  tenantSlug: 'test-supply-wastages-tenant',
  tenantSchema: 'tenant_test_dough_wastages',
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
    where: { name: '_test-plan-supply-wastages' },
    update: {},
    create: { name: '_test-plan-supply-wastages' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Dough Wastages Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-wastage-test-001' },
    update: {},
    create: { id: 'branch-wastage-test-001', name: 'Branch Wastage Test', tenantId },
  })
  branchId = branch.id

  await prisma.user.upsert({
    where: { username_tenantId: { username: 'wastage-cajero', tenantId } },
    update: {},
    create: { username: 'wastage-cajero', passwordHash, role: 'CAJERO', tenantId, branchId },
  })

  await tenantService.provision(TEST.tenantSchema)

  adminToken = server.jwt.sign({
    user_id: 'admin-wastage-test',
    tenant_id: tenantId,
    branch_id: branchId,
    role: UserRole.ADMIN,
    type: 'access',
  } satisfies JwtPayload)

  cajeroToken = server.jwt.sign({
    user_id: 'cajero-wastage-test',
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
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-supply-wastages' } })
  await prisma.$disconnect()
  await server.close()
})

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── POST /api/v1/supply-wastages ──────────────────────────────────────────────

describe('POST /api/v1/supply-wastages', () => {
  it('DW-01 — ADMIN registra merma correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-wastages',
      headers: authHeader(adminToken),
      payload: { supplyType: 'SMALL', quantity: 3, reason: 'FELL' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.supplyType).toBe('SMALL')
    expect(body.quantity).toBe(3)
    expect(body.reason).toBe('FELL')
    expect(body.branchId).toBe(branchId)
    expect(body.recordedAt).toBeDefined()
  })

  it('DW-02 — CAJERO también puede registrar merma', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-wastages',
      headers: authHeader(cajeroToken),
      payload: { supplyType: 'MEDIUM', quantity: 1, reason: 'BAD_SHAPE' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().reason).toBe('BAD_SHAPE')
  })

  it('DW-03 — motivo OTHER requiere nota (400 sin nota)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-wastages',
      headers: authHeader(adminToken),
      payload: { supplyType: 'LARGE', quantity: 2, reason: 'OTHER' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DW-04 — motivo OTHER con nota registra correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-wastages',
      headers: authHeader(adminToken),
      payload: { supplyType: 'LARGE', quantity: 2, reason: 'OTHER', notes: 'Se dañaron en el horno' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().notes).toBe('Se dañaron en el horno')
  })

  it('DW-05 — cantidad 0 devuelve 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-wastages',
      headers: authHeader(adminToken),
      payload: { supplyType: 'SMALL', quantity: 0, reason: 'FELL' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DW-06 — sin token devuelve 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-wastages',
      payload: { supplyType: 'SMALL', quantity: 1, reason: 'FELL' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /api/v1/supply-wastages ───────────────────────────────────────────────

describe('GET /api/v1/supply-wastages', () => {
  it('DW-07 — lista mermas de la sucursal', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-wastages',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0].branchId).toBe(branchId)
  })

  it('DW-08 — sin token devuelve 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-wastages',
    })
    expect(res.statusCode).toBe(401)
  })
})
