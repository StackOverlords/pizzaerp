import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaShiftRepository } from '../../infrastructure/database/repositories/prisma-shift-repository'
import { PrismaShiftClosureRepository } from '../../infrastructure/database/repositories/prisma-shift-closure-repository'
import { createOpenShiftUseCase } from '../../application/shifts/open-shift.use-case'
import { createGetCurrentShiftUseCase } from '../../application/shifts/get-current-shift.use-case'
import { createCloseShiftUseCase } from '../../application/shifts/close-shift.use-case'
import { createListClosedShiftsUseCase } from '../../application/shifts/list-closed-shifts.use-case'
import { userRepository } from '../../shared/container'
import { UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

interface OpenShiftBody {
  initialCash: number
}

const closureSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    shiftId: { type: 'string' },
    declaredCash: { type: 'number' },
    declaredQrCount: { type: 'number' },
    expectedCash: { type: 'number' },
    expectedQrTotal: { type: 'number' },
    expectedQrCount: { type: 'number' },
    cashDifference: { type: 'number' },
    qrCountDifference: { type: 'number' },
    notes: { type: ['string', 'null'] },
    closedAt: { type: 'string', format: 'date-time' },
  },
}

const shiftResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    branchId: { type: 'string' },
    userId: { type: 'string' },
    openedAt: { type: 'string', format: 'date-time' },
    closedAt: { type: ['string', 'null'], format: 'date-time' },
    initialCash: { type: 'number' },
    status: { type: 'string', enum: ['OPEN', 'CLOSED'] },
  },
}

export async function shiftRoutes(fastify: FastifyInstance) {
  // POST /shifts/open — abre turno para el cajero autenticado
  fastify.post<{ Body: OpenShiftBody }>(
    '/open',
    {
      schema: {
        tags: ['shifts'],
        summary: 'Abrir turno de caja',
        body: {
          type: 'object',
          required: ['initialCash'],
          properties: {
            initialCash: { type: 'number', minimum: 0 },
          },
        },
        response: { 201: shiftResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { user_id, tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaShiftRepository(db, schema)
        const openShift = createOpenShiftUseCase({ shiftRepository: repo })
        const shift = await openShift({ userId: user_id, branchId: branch_id, initialCash: request.body.initialCash })
        return reply.code(201).send(shift)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /shifts/current — retorna el turno abierto del usuario actual (null si no hay)
  fastify.get(
    '/current',
    {
      schema: {
        tags: ['shifts'],
        summary: 'Obtener turno abierto del cajero',
        response: {
          200: {
            oneOf: [shiftResponseSchema, { type: 'null' }],
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const { user_id, tenant_id, branch_id } = request.user
      if (!branch_id) return null

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaShiftRepository(db, schema)
        const getCurrentShift = createGetCurrentShiftUseCase({ shiftRepository: repo })
        return getCurrentShift(user_id, branch_id)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /shifts/history — historial paginado de turnos cerrados (solo ADMIN)
  fastify.get<{ Querystring: { page?: string; limit?: string; from?: string; to?: string } }>(
    '/history',
    {
      schema: {
        tags: ['shifts'],
        summary: 'Historial de turnos cerrados (admin)',
        querystring: {
          type: 'object',
          properties: {
            page:  { type: 'string' },
            limit: { type: 'string' },
            from:  { type: 'string', format: 'date-time' },
            to:    { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ...shiftResponseSchema.properties,
                    cashierUsername: { type: 'string' },
                    closure: { oneOf: [closureSchema, { type: 'null' }] },
                  },
                },
              },
              total: { type: 'number' },
              page:  { type: 'number' },
              limit: { type: 'number' },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const { tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const page  = parseInt(request.query.page  ?? '1',  10)
      const limit = parseInt(request.query.limit ?? '10', 10)
      const from  = request.query.from ? new Date(request.query.from) : undefined
      const to    = request.query.to   ? new Date(request.query.to)   : undefined

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const shiftRepo   = new PrismaShiftRepository(db, schema)
        const listClosed  = createListClosedShiftsUseCase({ shiftRepository: shiftRepo, userRepository })
        return listClosed({ branchId: branch_id, page, limit, from, to })
      } finally {
        await db.$disconnect()
      }
    },
  )

  // POST /shifts/close — cierre ciego de caja
  fastify.post<{ Body: { declaredCash: number; declaredQrCount: number; notes?: string } }>(
    '/close',
    {
      schema: {
        tags: ['shifts'],
        summary: 'Cierre ciego de caja — el cajero declara efectivo y QRs sin ver el total esperado',
        body: {
          type: 'object',
          required: ['declaredCash', 'declaredQrCount'],
          properties: {
            declaredCash: { type: 'number', minimum: 0 },
            declaredQrCount: { type: 'integer', minimum: 0 },
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shift: shiftResponseSchema,
              closure: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  shiftId: { type: 'string' },
                  declaredCash: { type: 'number' },
                  declaredQrCount: { type: 'number' },
                  expectedCash: { type: 'number' },
                  expectedQrTotal: { type: 'number' },
                  expectedQrCount: { type: 'number' },
                  cashDifference: { type: 'number' },
                  qrCountDifference: { type: 'number' },
                  notes: { type: ['string', 'null'] },
                  closedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const { user_id, tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const shiftRepo = new PrismaShiftRepository(db, schema)
        const closureRepo = new PrismaShiftClosureRepository(db, schema)
        const closeShift = createCloseShiftUseCase({ shiftRepository: shiftRepo, shiftClosureRepository: closureRepo })
        return closeShift({
          userId: user_id,
          branchId: branch_id,
          declaredCash: request.body.declaredCash,
          declaredQrCount: request.body.declaredQrCount,
          notes: request.body.notes,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )
}
