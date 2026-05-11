import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'

// Integration test — requires a real PostgreSQL connection (DATABASE_URL) and JWT_SECRET
// Nota: el test del happy path (POST /setup en DB limpia) requiere count(tenants) == 0.
// En este archivo siempre se crea un tenant de control en beforeAll para garantizar
// que el estado "ya configurado" sea reproducible.

const prisma = new PrismaClient()

const TEST = {
  tenantSlug: 'test-setup-control',
  tenantSchema: 'tenant_test_setup_control',
}

let server: FastifyInstance
let controlTenantId: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'
  server = await createServer()
  await prisma.$connect()

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Setup Control Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
    },
  })
  controlTenantId = tenant.id
})

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: controlTenantId } })
  await prisma.$disconnect()
  await server.close()
})

// ─── GET /setup/status ────────────────────────────────────────────────────────

describe('GET /api/v1/setup/status', () => {
  it('retorna configured: true cuando ya existe al menos un tenant', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/setup/status' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ configured: true })
  })
})

// ─── POST /setup ──────────────────────────────────────────────────────────────

describe('POST /api/v1/setup', () => {
  it('retorna 403 en modo SaaS (SUPER_ADMIN_KEY configurado)', async () => {
    // En el entorno de test, SUPER_ADMIN_KEY siempre está configurado (ver vitest.config.ts)
    // El endpoint debe rechazarse con 403 antes de cualquier otra validación
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/setup/',
      payload: {
        tenantName: 'Nuevo Negocio',
        slug: 'nuevo-negocio',
        username: 'admin',
        password: 'secret123',
      },
    })

    expect(res.statusCode).toBe(403)
  })

  it('retorna 400 si slug tiene formato inválido (validación de esquema se aplica siempre)', async () => {
    // La validación de esquema de Fastify corre antes del handler,
    // por eso un payload con slug inválido devuelve 400 incluso en modo SaaS
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/setup/',
      payload: {
        tenantName: 'Test',
        slug: 'Mi Negocio!',
        username: 'admin',
        password: 'secret123',
      },
    })

    expect(res.statusCode).toBe(400)
  })
})
