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
let adminNoBranchToken: string
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

  adminNoBranchToken = server.jwt.sign({
    user_id: 'admin-user-shifts-nobranch',
    tenant_id: tenantId,
    branch_id: null,
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

// ─── POST /shifts/close ───────────────────────────────────────────────────────

describe('POST /api/v1/shifts/close', () => {
  it('SH-09 — cierra turno sin diferencia (cuadre exacto)', async () => {
    // El turno abierto en SH-03 no tiene pagos → expected_cash = 200 (initialCash)
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 200, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(200)
    const { shift, closure } = res.json()
    expect(shift.status).toBe('CLOSED')
    expect(closure.expectedCash).toBe(200)
    expect(closure.declaredCash).toBe(200)
    expect(closure.cashDifference).toBe(0)
    expect(closure.qrCountDifference).toBe(0)
    expect(closure.notes).toBeNull()
  })

  it('SH-10 — devuelve 409 si no hay turno abierto', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 200, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(409)
  })

  it('SH-11 — cierre con diferencia requiere observación', async () => {
    // Abrir nuevo turno
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })

    // Intentar cerrar sin observación y con diferencia
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 50, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('SH-12 — cierra turno con diferencia y observación', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 50, declaredQrCount: 0, notes: 'Se extraviaron 50 Bs' },
    })
    expect(res.statusCode).toBe(200)
    const { closure } = res.json()
    expect(closure.cashDifference).toBe(-50)  // 50 declarado - 100 esperado
    expect(closure.notes).toBe('Se extraviaron 50 Bs')
  })

  it('SH-13 — devuelve 401 sin token', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      payload: { declaredCash: 100, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /shifts/history ──────────────────────────────────────────────────────

describe('GET /api/v1/shifts/history', () => {
  it('SH-14 — admin obtiene historial paginado de turnos cerrados', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/history?page=1&limit=10',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.page).toBe(1)
    expect(body.limit).toBe(10)
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThanOrEqual(2)
    expect(Array.isArray(body.data)).toBe(true)
    const first = body.data[0]
    expect(first.status).toBe('CLOSED')
    expect(typeof first.cashierUsername).toBe('string')
    expect(first.closure).not.toBeNull()
  })

  it('SH-15 — cada item incluye el closure con los campos correctos', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/history?page=1&limit=10',
      headers: authHeader(adminToken),
    })
    const { data } = res.json()
    for (const item of data) {
      expect(item.closure).toHaveProperty('declaredCash')
      expect(item.closure).toHaveProperty('expectedCash')
      expect(item.closure).toHaveProperty('cashDifference')
      expect(item.closure).toHaveProperty('closedAt')
    }
  })

  it('SH-16 — paginación: limit=1 devuelve solo 1 item y total correcto', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/history?page=1&limit=1',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(1)
    expect(body.total).toBeGreaterThanOrEqual(2)
    expect(body.limit).toBe(1)
  })

  it('SH-17 — cajero recibe 403', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/history',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(403)
  })

  it('SH-18 — devuelve 401 sin token', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/history',
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── POST /shifts/open — ADMIN branch override ────────────────────────────────

describe('POST /api/v1/shifts/open — ADMIN branch override', () => {
  it('SH-A1 — ADMIN sin branch en JWT + body.branchId → 201 con esa sucursal', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(adminNoBranchToken),
      payload: { initialCash: 100, branchId },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().branchId).toBe(branchId)
  })

  it('SH-A2 — ADMIN sin branch en JWT y sin body.branchId → 400', async () => {
    // Close any open shift for this admin first (SH-A1 may have opened one)
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(adminNoBranchToken),
      payload: { declaredCash: 100, declaredQrCount: 0 },
    })

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(adminNoBranchToken),
      payload: { initialCash: 100 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Debe seleccionar una sucursal')
  })

  it('SH-A3 — CAJERO con body.branchId → usa branch del JWT, no el del body', async () => {
    const otherBranchId = 'branch-shifts-other-001'
    // The body branchId is different from the cajero JWT branch
    // Result should still be 201 (using the JWT branchId) or 409 (if shift still open from SH-12)
    // Either way, the cajero's JWT branch_id controls — body is ignored
    const openRes = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 50, branchId: otherBranchId },
    })
    // Could be 409 if cajero already has open shift, or 201 using their JWT branch
    if (openRes.statusCode === 201) {
      expect(openRes.json().branchId).toBe(branchId) // JWT branch, not body
    } else {
      expect([409]).toContain(openRes.statusCode) // already open
    }
  })

  it('SH-A4 — ADMIN con branch en JWT + body.branchId → JWT gana, ignora body', async () => {
    const otherBranchId = 'branch-shifts-other-002'
    // Close any open admin shift first
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(adminToken),
      payload: { declaredCash: 0, declaredQrCount: 0 },
    })

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(adminToken),
      payload: { initialCash: 50, branchId: otherBranchId },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().branchId).toBe(branchId) // JWT branch wins
  })
})

// ─── POST /shifts/close — ADMIN branch override ───────────────────────────────

describe('POST /api/v1/shifts/close — ADMIN branch override', () => {
  it('SH-B1 — ADMIN sin branch en JWT + body.branchId → puede cerrar turno de esa sucursal', async () => {
    // Open a shift as admin-no-branch first
    const openRes = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(adminNoBranchToken),
      payload: { initialCash: 200, branchId },
    })
    // It may already be open from SH-A1 cleanup. Accept 201 or 409
    if (openRes.statusCode !== 201 && openRes.statusCode !== 409) {
      throw new Error(`Expected 201 or 409, got ${openRes.statusCode}`)
    }

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(adminNoBranchToken),
      payload: { declaredCash: 100, declaredQrCount: 0, branchId },
    })
    expect(res.statusCode).toBe(200)
  })

  it('SH-B2 — ADMIN sin branch en JWT y sin body.branchId → 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(adminNoBranchToken),
      payload: { declaredCash: 100, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Debe seleccionar una sucursal')
  })
})

// ─── POST /shifts/current/movements ──────────────────────────────────────────

describe('POST /api/v1/shifts/current/movements', () => {
  // Ensure the cajero has an open shift before these tests
  beforeAll(async () => {
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })
  })

  afterAll(async () => {
    // Close any open shift to leave state clean (notes required in case of difference)
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 0, declaredQrCount: 0, notes: 'cleanup' },
    })
  })

  it('CM-01 — registra INGRESO con datos válidos → 201', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: 50, reason: 'Fondo de cambio' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.type).toBe('INGRESO')
    expect(body.amount).toBe(50)
    expect(body.reason).toBe('Fondo de cambio')
    expect(body.shiftId).toBeDefined()
    expect(body.createdAt).toBeDefined()
  })

  it('CM-02 — registra RETIRO con datos válidos → 201', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'RETIRO', amount: 200, reason: 'Pago a proveedor' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().type).toBe('RETIRO')
    expect(res.json().amount).toBe(200)
  })

  it('CM-03 — amount <= 0 → 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: 0, reason: 'Motivo' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('CM-04 — amount negativo → 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: -10, reason: 'Motivo' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('CM-05 — reason vacío → 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: 50, reason: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('CM-06 — sin token → 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      payload: { type: 'INGRESO', amount: 50, reason: 'Test' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /shifts/current/movements ───────────────────────────────────────────

describe('GET /api/v1/shifts/current/movements', () => {
  beforeAll(async () => {
    // Ensure a fresh open shift exists for the cajero
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })
    // Add one movement
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: 30, reason: 'Lista test' },
    })
  })

  afterAll(async () => {
    // notes required since expectedCash = 130 but we declare 0
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 0, declaredQrCount: 0, notes: 'cleanup' },
    })
  })

  it('CM-07 — retorna array con movimientos del turno abierto → 200', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(1)
    expect(body[0]).toHaveProperty('id')
    expect(body[0]).toHaveProperty('type')
    expect(body[0]).toHaveProperty('amount')
  })

  it('CM-08 — sin token → 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/current/movements',
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── POST /shifts/close — fórmula con movimientos de caja ────────────────────

describe('POST /api/v1/shifts/close — fórmula con movimientos de caja', () => {
  it('CM-09 — INGRESO incrementa expectedCash', async () => {
    // Open a fresh shift: initialCash = 100
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })
    // Add INGRESO 50
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: 50, reason: 'Test ingreso' },
    })
    // Close: expectedCash = 100 + 0 (no sales) + 50 = 150
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 150, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().closure.expectedCash).toBe(150)
    expect(res.json().closure.cashDifference).toBe(0)
  })

  it('CM-10 — RETIRO reduce expectedCash', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })
    // Add RETIRO 30
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'RETIRO', amount: 30, reason: 'Test retiro' },
    })
    // Close: expectedCash = 100 + 0 - 30 = 70
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 70, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().closure.expectedCash).toBe(70)
    expect(res.json().closure.cashDifference).toBe(0)
  })

  it('CM-11 — movimientos mixtos (INGRESO + RETIRO)', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: 50, reason: 'Test mixto ingreso' },
    })
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'RETIRO', amount: 30, reason: 'Test mixto retiro' },
    })
    // Close: expectedCash = 100 + 0 + 50 - 30 = 120
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 120, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().closure.expectedCash).toBe(120)
    expect(res.json().closure.cashDifference).toBe(0)
  })

  it('CM-12 — sin movimientos: fórmula regresión (sin cambio)', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 200 },
    })
    // Close without movements: expectedCash = 200
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 200, declaredQrCount: 0 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().closure.expectedCash).toBe(200)
    expect(res.json().closure.cashDifference).toBe(0)
  })
})

// ─── POST /shifts/current/movements — sin turno abierto ──────────────────────

describe('POST /api/v1/shifts/current/movements — sin turno abierto', () => {
  // All shifts opened/closed within CM-09..CM-12; at this point no open shift exists.

  it('CM-13 — sin turno abierto → 409', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: 50, reason: 'Sin turno' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('CM-14 — turno recién cerrado → 409', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 100, declaredQrCount: 0 },
    })
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
      payload: { type: 'INGRESO', amount: 50, reason: 'Turno cerrado' },
    })
    expect(res.statusCode).toBe(409)
  })
})

// ─── GET /shifts/current/movements — turno sin movimientos ───────────────────

describe('GET /api/v1/shifts/current/movements — turno sin movimientos', () => {
  beforeAll(async () => {
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: authHeader(cajeroToken),
      payload: { initialCash: 100 },
    })
  })

  afterAll(async () => {
    await server.inject({
      method: 'POST',
      url: '/api/v1/shifts/close',
      headers: authHeader(cajeroToken),
      payload: { declaredCash: 100, declaredQrCount: 0 },
    })
  })

  it('CM-15 — turno sin movimientos → 200 con array vacío', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/shifts/current/movements',
      headers: authHeader(cajeroToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })
})
