import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'
import { TenantSchemaService } from '../../../infrastructure/database/tenant-schema.service'
import type { JwtPayload } from '../../plugins/jwt.plugin'
import { UserRole } from '../../../domain/entities/user'

const prisma = new PrismaClient()
const tenantService = new TenantSchemaService(prisma)

const TEST = {
  tenantSlug: 'test-supply-types-tenant',
  tenantSchema: 'tenant_test_supply_types',
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

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-supply-types' },
    update: {},
    create: { name: '_test-plan-supply-types' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Supply Types Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-supply-types-001' },
    update: {},
    create: { id: 'branch-supply-types-001', name: 'Branch Supply Types Test', tenantId },
  })
  branchId = branch.id

  await tenantService.provision(TEST.tenantSchema)

  adminToken = server.jwt.sign({
    user_id: 'admin-supply-types-test',
    tenant_id: tenantId,
    branch_id: branchId,
    role: UserRole.ADMIN,
    type: 'access',
  } satisfies JwtPayload)

  cajeroToken = server.jwt.sign({
    user_id: 'cajero-supply-types-test',
    tenant_id: tenantId,
    branch_id: branchId,
    role: UserRole.CAJERO,
    type: 'access',
  } satisfies JwtPayload)
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST.tenantSchema}" CASCADE`)
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-supply-types' } })
  await prisma.$disconnect()
  await server.close()
})

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── POST /api/v1/supply-types ─────────────────────────────────────────────────

describe('POST /api/v1/supply-types', () => {
  it('ST-01 — ADMIN crea tipo de insumo correctamente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-types',
      headers: authHeader(adminToken),
      payload: { name: 'Masa Pequeña' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.name).toBe('Masa Pequeña')
    expect(body.active).toBe(true)
    expect(body.createdAt).toBeDefined()
  })

  it('ST-02 — nombre duplicado devuelve 409', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-types',
      headers: authHeader(adminToken),
      payload: { name: 'Masa Pequeña' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('ST-03 — nombre vacío devuelve 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-types',
      headers: authHeader(adminToken),
      payload: { name: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('ST-04 — CAJERO no puede crear tipos (403)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-types',
      headers: authHeader(cajeroToken),
      payload: { name: 'Tipo Cajero' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('ST-05 — sin token devuelve 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-types',
      payload: { name: 'Sin token' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /api/v1/supply-types ──────────────────────────────────────────────────

describe('GET /api/v1/supply-types', () => {
  it('ST-06 — lista tipos del tenant', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-types',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0].name).toBeDefined()
    expect(body[0].active).toBeDefined()
  })

  it('ST-07 — sin token devuelve 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/supply-types',
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── PUT /api/v1/supply-types/:id ─────────────────────────────────────────────

describe('PUT /api/v1/supply-types/:id', () => {
  let typeId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-types',
      headers: authHeader(adminToken),
      payload: { name: 'Tipo Para Actualizar' },
    })
    typeId = res.json().id
  })

  it('ST-08 — ADMIN actualiza nombre correctamente', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/supply-types/${typeId}`,
      headers: authHeader(adminToken),
      payload: { name: 'Tipo Actualizado' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Tipo Actualizado')
  })

  it('ST-09 — nombre duplicado en otro tipo devuelve 409', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/supply-types/${typeId}`,
      headers: authHeader(adminToken),
      payload: { name: 'Masa Pequeña' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('ST-10 — ID inexistente devuelve 404', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/v1/supply-types/00000000-0000-0000-0000-000000000000',
      headers: authHeader(adminToken),
      payload: { name: 'Nuevo Nombre' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── PATCH /api/v1/supply-types/:id/deactivate ────────────────────────────────

describe('PATCH /api/v1/supply-types/:id/deactivate', () => {
  let typeId: string

  beforeAll(async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/supply-types',
      headers: authHeader(adminToken),
      payload: { name: 'Tipo Para Desactivar' },
    })
    typeId = res.json().id
  })

  it('ST-11 — ADMIN desactiva tipo correctamente', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/supply-types/${typeId}/deactivate`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().active).toBe(false)
  })

  it('ST-12 — desactivar tipo ya inactivo devuelve 409', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/supply-types/${typeId}/deactivate`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(409)
  })

  it('ST-13 — ID inexistente devuelve 404', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/v1/supply-types/00000000-0000-0000-0000-000000000000/deactivate',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })
})
