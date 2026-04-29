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
  tenantSlug: 'test-shifts-tenant',
  tenantSchema: 'tenant_test_shifts',
  username: 'shifts-cajero',
  password: 'testpass123',
}

let server: FastifyInstance
let tenantId: string
let branchId: string
let cajeroToken: string
let adminToken: string
let cajeroUserId: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'

  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash(TEST.password, 12)

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-shifts' },
    update: {},
    create: { name: '_test-plan-shifts' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Shifts Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-shifts-test-001' },
    update: {},
    create: { id: 'branch-shifts-test-001', name: 'Branch Test Shifts', tenantId },
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

  adminToken = server.jwt.sign({
    user_id: 'admin-user-shifts-test',
    tenant_id: tenantId,
    branch_id: branchId,
    role: UserRole.ADMIN,
    type: 'access',
  } satisfies JwtPayload)
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-shifts' } })
  await prisma.$disconnect()
  await server.close()
})

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── GET /shifts/current — sin turno abierto ──────────────────────────────────

describe('GET /api/v1/shifts/current', () => {
  it('SH-01 — devuelve null cuando no hay turno abierto', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/current',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toBeNull()
  })

  it('SH-02 — devuelve 401 sin token', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/current',
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── POST /shifts/open ────────────────────────────────────────────────────────

describe('POST /api/v1/shifts/open', () => {
  it('SH-03 — CAJERO abre turno correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 200 },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.branchId).toBe(branchId)
    expect(body.userId).toBe(cajeroUserId)
    expect(body.initialCash).toBe(200)
    expect(body.status).toBe('OPEN')
    expect(body.closedAt).toBeNull()
  })

  it('SH-04 — devuelve 409 si ya hay turno abierto', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })
    expect(res.statusCode).toBe(409)
  })

  it('SH-05 — devuelve 400 si initialCash es negativo', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(adminToken),
      payload: { initialCash: -50 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('SH-06 — devuelve 400 si falta initialCash', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(adminToken),
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('SH-07 — devuelve 401 sin token', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      payload: { initialCash: 100 },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /shifts/current — con turno abierto ─────────────────────────────────

describe('GET /api/v1/shifts/current — con turno activo', () => {
  it('SH-08 — retorna el turno abierto del cajero', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/current',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).not.toBeNull()
    expect(body.status).toBe('OPEN')
    expect(body.userId).toBe(cajeroUserId)
  })
})
