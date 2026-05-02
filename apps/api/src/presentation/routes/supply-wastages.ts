import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaSupplyWastageRepository } from '../../infrastructure/database/repositories/prisma-supply-wastage-repository'
import { PrismaSupplyTypeRepository } from '../../infrastructure/database/repositories/prisma-supply-type-repository'
import { createCreateSupplyWastageUseCase } from '../../application/supply-wastages/create-supply-wastage.use-case'
import { createListSupplyWastagesUseCase } from '../../application/supply-wastages/list-supply-wastages.use-case'
import { Errors } from '../../shared/errors/app-error'

interface CreateBody {
  supplyType: string
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
    supplyType: { type: 'string' },
    quantity: { type: 'number' },
    reason: { type: 'string', enum: ['FELL', 'BAD_SHAPE', 'BURNED', 'CONTAMINATED', 'OTHER'] },
    notes: { type: ['string', 'null'] },
    recordedAt: { type: 'string', format: 'date-time' },
  },
}

export async function supplyWastageRoutes(fastify: FastifyInstance) {
  // POST /supply-wastages — registrar merma (ADMIN y CAJERO)
  fastify.post<{ Body: CreateBody }>(
    '/',
    {
      schema: {
        tags: ['supply-wastages'],
        summary: 'Registrar merma de insumo',
        body: {
          type: 'object',
          required: ['supplyType', 'quantity', 'reason'],
          properties: {
            supplyType: { type: 'string', minLength: 1 },
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
        const supplyWastageRepo = new PrismaSupplyWastageRepository(db, schema)
        const supplyTypeRepo = new PrismaSupplyTypeRepository(db, schema)
        const createWastage = createCreateSupplyWastageUseCase({
          supplyWastageRepository: supplyWastageRepo,
          supplyTypeRepository: supplyTypeRepo,
        })
        const wastage = await createWastage({
          branchId: branch_id,
          userId: user_id,
          supplyType: request.body.supplyType,
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

  // GET /supply-wastages — reporte diario de mermas de la sucursal (ADMIN y CAJERO)
  fastify.get<{ Querystring: ListQuery }>(
    '/',
    {
      schema: {
        tags: ['supply-wastages'],
        summary: 'Listar mermas de insumo de la sucursal',
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
        const repo = new PrismaSupplyWastageRepository(db, schema)
        const listWastages = createListSupplyWastagesUseCase({ supplyWastageRepository: repo })
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
