import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaDoughWastageRepository } from '../../infrastructure/database/repositories/prisma-dough-wastage-repository'
import { createCreateDoughWastageUseCase } from '../../application/dough-wastages/create-dough-wastage.use-case'
import { createListDoughWastagesUseCase } from '../../application/dough-wastages/list-dough-wastages.use-case'
import { Errors } from '../../shared/errors/app-error'

interface CreateBody {
  doughType: string
  quantity: number
  reason: string
  notes?: string | null
}

interface ListQuery {
  from?: string
  to?: string
}

const wastageSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    branchId: { type: 'string' },
    userId: { type: 'string' },
    doughType: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
    quantity: { type: 'number' },
    reason: { type: 'string', enum: ['FELL', 'BAD_SHAPE', 'BURNED', 'CONTAMINATED', 'OTHER'] },
    notes: { type: ['string', 'null'] },
    recordedAt: { type: 'string', format: 'date-time' },
  },
}

export async function doughWastageRoutes(fastify: FastifyInstance) {
  // POST /dough-wastages — registrar merma (ADMIN y CAJERO)
  fastify.post<{ Body: CreateBody }>(
    '/',
    {
      schema: {
        tags: ['dough-wastages'],
        summary: 'Registrar merma de masa',
        body: {
          type: 'object',
          required: ['doughType', 'quantity', 'reason'],
          properties: {
            doughType: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
            quantity: { type: 'integer', minimum: 1 },
            reason: { type: 'string', enum: ['FELL', 'BAD_SHAPE', 'BURNED', 'CONTAMINATED', 'OTHER'] },
            notes: { type: 'string' },
          },
        },
        response: { 201: wastageSchema },
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
        const repo = new PrismaDoughWastageRepository(db, schema)
        const createWastage = createCreateDoughWastageUseCase({ doughWastageRepository: repo })
        const wastage = await createWastage({
          branchId: branch_id,
          userId: user_id,
          doughType: request.body.doughType,
          quantity: request.body.quantity,
          reason: request.body.reason,
          notes: request.body.notes,
        })
        return reply.code(201).send(wastage)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /dough-wastages — reporte diario de mermas de la sucursal (ADMIN y CAJERO)
  fastify.get<{ Querystring: ListQuery }>(
    '/',
    {
      schema: {
        tags: ['dough-wastages'],
        summary: 'Listar mermas de masa de la sucursal',
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
        },
        response: { 200: { type: 'array', items: wastageSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const { tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDoughWastageRepository(db, schema)
        const listWastages = createListDoughWastagesUseCase({ doughWastageRepository: repo })
        return listWastages({
          branchId: branch_id,
          from: request.query.from ? new Date(request.query.from) : undefined,
          to: request.query.to ? new Date(request.query.to) : undefined,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )
}
