import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { createServer } from '../../../app'
import { authenticate } from '../../hooks/authenticate.hook'
import { authorize } from '../../hooks/authorize.hook'
import { UserRole } from '../../../domain/entities/user'
import type { JwtPayload } from '../../plugins/jwt.plugin'

// Integration test — requires a real PostgreSQL connection (DATABASE_URL) and JWT_SECRET

const prisma = new PrismaClient()

const TEST = {
  tenantSlug: 'test-auth-tenant',
  tenantSchema: 'tenant_test_auth',
  username: 'auth-test-admin',
  password: 'testpass123',
}

let server: FastifyInstance
let tenantId: string
let branchId: string
let userId: string

beforeAll(async () => {
  process.env.JWT_SECRET ??= 'vitest-jwt-secret-at-least-32-chars-long'

  server = await createServer()

  // Protected test routes for CA-03 and CA-04
  server.get('/api/v1/test/protected', { preHandler: [authenticate] }, () => ({ ok: true }))
  server.get('/api/v1/test/admin-only', { preHandler: [authenticate, authorize([UserRole.ADMIN])] }, () => ({ ok: true }))
  server.get('/api/v1/test/cajero-only', { preHandler: [authenticate, authorize([UserRole.CAJERO])] }, () => ({ ok: true }))

  await prisma.$connect()

  const passwordHash = await bcrypt.hash(TEST.password, 12)

  const plan = await prisma.plan.upsert({
    where: { name: '_test-plan-auth' },
    update: {},
    create: { name: '_test-plan-auth' },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: TEST.tenantSlug },
    update: {},
    create: {
      name: 'Auth Test Tenant',
      slug: TEST.tenantSlug,
      schema: TEST.tenantSchema,
      status: 'ACTIVE',
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } },
    },
  })
  tenantId = tenant.id

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-auth-test-001' },
    update: {},
    create: { id: 'branch-auth-test-001', name: 'Branch Test', tenantId },
  })
  branchId = branch.id

  const user = await prisma.user.upsert({
    where: { username_tenantId: { username: TEST.username, tenantId } },
    update: {},
    create: { username: TEST.username, passwordHash, role: 'ADMIN', tenantId, branchId },
  })
  userId = user.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { tenantId } })
  await prisma.branch.deleteMany({ where: { tenantId } })
  await prisma.subscription.deleteMany({ where: { tenantId } })
  await prisma.tenant.delete({ where: { slug: TEST.tenantSlug } })
  await prisma.plan.deleteMany({ where: { name: '_test-plan-auth' } })
  await prisma.$disconnect()
  await server.close()
})

// ─── Helper ──────────────────────────────────────────────────────────────────

async function login() {
  const res = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { username: TEST.username, password: TEST.password, tenantId },
  })
  return res.json<{ access_token: string; refresh_token: string }>()
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('CA-01 — devuelve access_token y refresh_token con credenciales válidas', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: TEST.username, password: TEST.password, tenantId },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ access_token: string; refresh_token: string }>()
    expect(typeof body.access_token).toBe('string')
    expect(typeof body.refresh_token).toBe('string')
  })

  it('CA-02 — access_token contiene user_id, tenant_id, branch_id, role y exp', async () => {
    const { access_token } = await login()
    const payload = server.jwt.verify<JwtPayload>(access_token)

    expect(payload.user_id).toBe(userId)
    expect(payload.tenant_id).toBe(tenantId)
    expect(payload.branch_id).toBe(branchId)
    expect(payload.role).toBe(UserRole.ADMIN)
    expect(payload.type).toBe('access')
    expect(typeof payload.exp).toBe('number')
  })

  it('CA-05 — access_token expira en 15 minutos', async () => {
    const { access_token } = await login()
    const payload = server.jwt.verify<JwtPayload & { iat: number }>(access_token)

    expect(payload.exp! - payload.iat).toBe(15 * 60)
  })

  it('CA-05 — refresh_token expira en 7 días', async () => {
    const { refresh_token } = await login()
    const payload = server.jwt.verify<JwtPayload & { iat: number }>(refresh_token)

    expect(payload.exp! - payload.iat).toBe(7 * 24 * 60 * 60)
    expect(payload.type).toBe('refresh')
  })

  it('CA-07 — devuelve 401 con contraseña incorrecta', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: TEST.username, password: 'wrong-password', tenantId },
    })

    expect(res.statusCode).toBe(401)
  })

  it('devuelve 401 para usuario inexistente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'ghost', password: TEST.password, tenantId },
    })

    expect(res.statusCode).toBe(401)
  })

  it('devuelve 401 para tenantId incorrecto', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: TEST.username, password: TEST.password, tenantId: 'wrong-tenant' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('devuelve 400 cuando faltan campos requeridos', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: TEST.username },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('CA-06 — devuelve nuevo access_token con refresh_token válido', async () => {
    const { refresh_token } = await login()

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ access_token: string }>()
    expect(typeof body.access_token).toBe('string')

    const payload = server.jwt.verify<JwtPayload>(body.access_token)
    expect(payload.type).toBe('access')
    expect(payload.user_id).toBe(userId)
  })

  it('devuelve 401 con token inválido', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: 'not-a-valid-token' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('devuelve 401 si se usa el access_token como refresh_token', async () => {
    const { access_token } = await login()

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: access_token },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ─── authenticate hook (CA-03) ────────────────────────────────────────────────

describe('authenticate hook (CA-03)', () => {
  it('devuelve 401 sin Authorization header', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/test/protected' })

    expect(res.statusCode).toBe(401)
  })

  it('devuelve 401 con token malformado', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/test/protected',
      headers: { Authorization: 'Bearer not.a.jwt' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('devuelve 401 si se usa el refresh_token como access_token', async () => {
    const { refresh_token } = await login()

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/test/protected',
      headers: { Authorization: `Bearer ${refresh_token}` },
    })

    expect(res.statusCode).toBe(401)
  })

  it('permite el acceso con access_token válido', async () => {
    const { access_token } = await login()

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/test/protected',
      headers: { Authorization: `Bearer ${access_token}` },
    })

    expect(res.statusCode).toBe(200)
  })
})

// ─── authorize hook (CA-04) ───────────────────────────────────────────────────

describe('authorize hook (CA-04)', () => {
  it('permite acceso al rol correcto (ADMIN)', async () => {
    const { access_token } = await login()

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/test/admin-only',
      headers: { Authorization: `Bearer ${access_token}` },
    })

    expect(res.statusCode).toBe(200)
  })

  it('ADMIN accede a rutas de CAJERO (acceso universal)', async () => {
    const { access_token } = await login()

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/test/cajero-only',
      headers: { Authorization: `Bearer ${access_token}` },
    })

    expect(res.statusCode).toBe(200)
  })

  it('devuelve 403 para token firmado con rol no autorizado', async () => {
    // Firmamos un token de CAJERO sin pasar por el flujo de login
    const cajeroToken = server.jwt.sign({
      user_id: 'fake-id',
      tenant_id: tenantId,
      branch_id: branchId,
      role: UserRole.CAJERO,
      type: 'access',
    } satisfies JwtPayload)

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/test/admin-only',
      headers: { Authorization: `Bearer ${cajeroToken}` },
    })

    expect(res.statusCode).toBe(403)
  })
})
