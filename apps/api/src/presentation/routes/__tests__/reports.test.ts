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
  tenantSlug: 'test-reports-tenant',
  tenantSchema: 'tenant_test_reports',
  closureDate: '2026-04-30',
}

let server: FastifyInstance
let tenantId: string
let branchAId: string
let branchBId: string
let adminToken: string
let cajeroToken: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'

  server = await createServer()
  await prisma.$connect()

  const passwordHash = await require('bcryptjs').hash('testpass', 12)

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-reports' },
    update: {},
    create: { name: '_test-plan-reports' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Reports Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branchA = await prisma.branch.upsert({
    where: { id: 'branch-report-a-001' },
    update: {},
    create: { id: 'branch-report-a-001', name: 'Branch Report A', tenantId },
  })
  branchAId = branchA.id

  const branchB = await prisma.branch.upsert({
    where: { id: 'branch-report-b-001' },
    update: {},
    create: { id: 'branch-report-b-001', name: 'Branch Report B', tenantId },
  })
  branchBId = branchB.id

  await prisma.user.upsert({
    where: { username_tenantId: { username: 'report-cajero', tenantId } },
    update: {},
    create: { username: 'report-cajero', passwordHash, role: 'CAJERO', tenantId, branchId: branchAId },
  })

  await tenantService.provision(TEST.tenantSchema)

  const adminAToken = server.jwt.sign({
    user_id: 'admin-report-a',
    tenant_id: tenantId,
    branch_id: branchAId,
    role: UserRole.ADMIN,
    type: 'access',
  } satisfies JwtPayload)

  const adminBToken = server.jwt.sign({
    user_id: 'admin-report-b',
    tenant_id: tenantId,
    branch_id: branchBId,
    role: UserRole.ADMIN,
    type: 'access',
  } satisfies JwtPayload)

  adminToken = adminAToken

  cajeroToken = server.jwt.sign({
    user_id: 'cajero-report-a',
    tenant_id: tenantId,
    branch_id: branchAId,
    role: UserRole.CAJERO,
    type: 'access',
  } satisfies JwtPayload)

  // Seed: envío de B → A recibido (initial=10 SMALL)
  const tf = await server.inject({
    method: 'POST',
    url: '/api/v1/dough-transfers',
    headers: { Authorization: `Bearer ${adminBToken}` },
    payload: {
      toBranchId: branchAId,
      transferDate: TEST.closureDate,
      items: [{ doughType: 'SMALL', quantitySent: 10 }],
    },
  })
  await server.inject({
    method: 'PATCH',
    url: `/api/v1/dough-transfers/${tf.json().id}/receive`,
    headers: { Authorization: `Bearer ${adminAToken}` },
    payload: { items: [{ doughType: 'SMALL', quantityReceived: 10 }] },
  })

  // Seed: 1 merma SMALL en A
  await server.inject({
    method: 'POST',
    url: '/api/v1/dough-wastages',
    headers: { Authorization: `Bearer ${adminAToken}` },
    payload: { doughType: 'SMALL', quantity: 1, reason: 'FELL' },
  })

  // Seed: cierre SMALL en A — diff=0 (GREEN): initial=10, wastage=1, sold=8, actual=1
  await server.inject({
    method: 'POST',
    url: '/api/v1/dough-closings',
    headers: { Authorization: `Bearer ${adminAToken}` },
    payload: {
      closureDate: TEST.closureDate,
      doughType: 'SMALL',
      soldCount: 8,
      actualRemaining: 1,
    },
  })
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-reports' } })
  await prisma.$disconnect()
  await server.close()
})

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── GET /api/v1/reports/dough-transfers ──────────────────────────────────────

describe('GET /api/v1/reports/dough-transfers', () => {
  it('RP-01 — ADMIN obtiene el reporte con indicadores por sucursal', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/reports/dough-transfers',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)

    const report = body[0]
    expect(report.branchId).toBeDefined()
    expect(report.date).toBe(TEST.closureDate)
    expect(report.overallStatus).toBeDefined()
    expect(['GREEN', 'YELLOW', 'RED']).toContain(report.overallStatus)
  })

  it('RP-02 — diferencia 0 devuelve GREEN', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/reports/dough-transfers',
      headers: authHeader(adminToken),
    })
    const body = res.json()
    const aReport = body.find((r: { branchId: string }) => r.branchId === branchAId)
    expect(aReport).toBeDefined()
    const small = aReport.doughTypes.find((d: { doughType: string }) => d.doughType === 'SMALL')
    expect(small.difference).toBe(0)
    expect(small.status).toBe('GREEN')
    expect(aReport.overallStatus).toBe('GREEN')
  })

  it('RP-03 — filtro por branchId devuelve solo esa sucursal', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/reports/dough-transfers?branchId=${branchAId}`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.every((r: { branchId: string }) => r.branchId === branchAId)).toBe(true)
  })

  it('RP-04 — filtro por from/to filtra por fecha', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/reports/dough-transfers?from=${TEST.closureDate}&to=${TEST.closureDate}`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('RP-05 — CAJERO no puede ver el reporte (403)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/reports/dough-transfers',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(403)
  })

  it('RP-06 — sin token devuelve 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/reports/dough-transfers',
    })
    expect(res.statusCode).toBe(401)
  })
})
