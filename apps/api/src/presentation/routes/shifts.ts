import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaShiftRepository } from '../../infrastructure/database/repositories/prisma-shift-repository'
import { createOpenShiftUseCase } from '../../application/shifts/open-shift.use-case'
import { createGetCurrentShiftUseCase } from '../../application/shifts/get-current-shift.use-case'
import { Errors } from '../../shared/errors/app-error'

interface OpenShiftBody {
  initialCash: number
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
}
