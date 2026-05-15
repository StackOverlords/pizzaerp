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
  tenantSlug:   'test-tenant-settings-tenant',
  tenantSchema: 'tenant_test_tenant_settings',
  username:     'settings-cajero',
  password:     'testpass123',
}

let server: FastifyInstance
let tenantId: string
let branchId: string
let cajeroToken: string
let adminToken: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'

  server = await createServer()
  await prisma.$connect()

  const passwordHash = await bcrypt.hash(TEST.password, 12)

  const plan = await prisma.plan.upsert({
    where:  { name: '_test-plan-settings' },
    update: {},
    create: { name: '_test-plan-settings' },
  })

  const tenant = await prisma.tenant.upsert({
    where:  { slug: TEST.tenantSlug },
    update: {},
    create: {
      name:         'Settings Test Tenant',
      slug:         TEST.tenantSlug,
      schema:       TEST.tenantSchema,
      status:       'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branch = await prisma.branch.upsert({
    where:  { id: 'branch-settings-test-001' },
    update: {},
    create: { id: 'branch-settings-test-001', name: 'Branch Test Settings', tenantId },
  })
  branchId = branch.id

  await prisma.user.upsert({
    where:  { username_tenantId: { username: TEST.username, tenantId } },
    update: {},
    create: { username: TEST.username, passwordHash, role: 'CAJERO', tenantId, branchId },
  })

  await tenantService.provision(TEST.tenantSchema)

  cajeroToken = server.jwt.sign({
    user_id:   'cajero-user-settings-test',
    tenant_id: tenantId,
    branch_id: branchId,
    role:      UserRole.CAJERO,
    type:      'access',
  } satisfies JwtPayload)

  adminToken = server.jwt.sign({
    user_id:   'admin-user-settings-test',
    tenant_id: tenantId,
    branch_id: branchId,
    role:      UserRole.ADMIN,
    type:      'access',
  } satisfies JwtPayload)
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-settings' } })
  await prisma.$disconnect()
  await server.close()
})

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── GET /tenant-settings ─────────────────────────────────────────────────────

describe('GET /api/v1/tenant-settings', () => {
  it('TS-01 — retorna configuración del tenant incluyendo blindCloseEnabled (default true)', async () => {
    const res = await server.inject({
      method:  'GET',
      url:     '/api/v1/tenant-settings',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.requirePinForCancel).toBe('boolean')
    expect(typeof body.requirePinForDiscount).toBe('boolean')
    expect(body.blindCloseEnabled).toBe(true)
  })

  it('TS-02 — cajero también puede obtener la configuración', async () => {
    const res = await server.inject({
      method:  'GET',
      url:     '/api/v1/tenant-settings',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    expect(typeof res.json().blindCloseEnabled).toBe('boolean')
  })
})

// ─── PATCH /tenant-settings — blind_close_enabled ────────────────────────────

describe('PATCH /api/v1/tenant-settings — blind_close_enabled', () => {
  it('TS-03 — ADMIN puede cambiar blind_close_enabled a false', async () => {
    const patchRes = await server.inject({
      method:  'PATCH',
      url:     '/api/v1/tenant-settings',
      headers: authHeader(adminToken),
      payload: { key: 'blind_close_enabled', value: false },
    })
    expect(patchRes.statusCode).toBe(200)
    expect(patchRes.json().ok).toBe(true)

    // Verify GET returns the new value
    const getRes = await server.inject({
      method:  'GET',
      url:     '/api/v1/tenant-settings',
      headers: authHeader(adminToken),
    })
    expect(getRes.statusCode).toBe(200)
    expect(getRes.json().blindCloseEnabled).toBe(false)
  })

  it('TS-04 — ADMIN puede volver a activar blind_close_enabled a true', async () => {
    const patchRes = await server.inject({
      method:  'PATCH',
      url:     '/api/v1/tenant-settings',
      headers: authHeader(adminToken),
      payload: { key: 'blind_close_enabled', value: true },
    })
    expect(patchRes.statusCode).toBe(200)

    const getRes = await server.inject({
      method:  'GET',
      url:     '/api/v1/tenant-settings',
      headers: authHeader(adminToken),
    })
    expect(getRes.json().blindCloseEnabled).toBe(true)
  })

  it('TS-05 — CAJERO no puede modificar tenant-settings → 403', async () => {
    const res = await server.inject({
      method:  'PATCH',
      url:     '/api/v1/tenant-settings',
      headers: authHeader(cajeroToken),
      payload: { key: 'blind_close_enabled', value: false },
    })
    expect(res.statusCode).toBe(403)
  })
})
