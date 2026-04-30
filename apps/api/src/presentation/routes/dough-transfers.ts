import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaDoughTransferRepository } from '../../infrastructure/database/repositories/prisma-dough-transfer-repository'
import { createCreateDoughTransferUseCase } from '../../application/dough-transfers/create-dough-transfer.use-case'
import { createListDoughTransfersUseCase } from '../../application/dough-transfers/list-dough-transfers.use-case'
import { UserRole } from '../../domain/entities/user'
import { DoughTransferStatus } from '../../domain/entities/dough-transfer'
import { Errors } from '../../shared/errors/app-error'

interface CreateBody {
  toBranchId: string
  transferDate: string
  items: { doughType: string; quantitySent: number; notes?: string | null }[]
  notes?: string | null
}

interface ListQuery {
  status?: string
  from?: string
  to?: string
}

const itemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    transferId: { type: 'string' },
    doughType: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
    quantitySent: { type: 'number' },
    quantityReceived: { type: ['number', 'null'] },
    notes: { type: ['string', 'null'] },
  },
}

const transferSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    fromBranchId: { type: 'string' },
    toBranchId: { type: 'string' },
    sentByUserId: { type: 'string' },
    status: { type: 'string', enum: ['IN_TRANSIT', 'RECEIVED'] },
    transferDate: { type: 'string' },
    notes: { type: ['string', 'null'] },
    sentAt: { type: 'string', format: 'date-time' },
    receivedAt: { type: ['string', 'null'], format: 'date-time' },
    items: { type: 'array', items: itemSchema },
  },
}

export async function doughTransferRoutes(fastify: FastifyInstance) {
  // POST /dough-transfers — registrar envío de masas (solo ADMIN)
  fastify.post<{ Body: CreateBody }>(
    '/',
    {
      schema: {
        tags: ['dough-transfers'],
        summary: 'Registrar envío de masas a una sucursal',
        body: {
          type: 'object',
          required: ['toBranchId', 'transferDate', 'items'],
          properties: {
            toBranchId: { type: 'string' },
            transferDate: { type: 'string', format: 'date' },
            notes: { type: 'string' },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['doughType', 'quantitySent'],
                properties: {
                  doughType: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
                  quantitySent: { type: 'integer', minimum: 1 },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        response: { 201: transferSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const { user_id, tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDoughTransferRepository(db, schema)
        const createTransfer = createCreateDoughTransferUseCase({ doughTransferRepository: repo })
        const transfer = await createTransfer({
          fromBranchId: branch_id,
          toBranchId: request.body.toBranchId,
          sentByUserId: user_id,
          transferDate: request.body.transferDate,
          notes: request.body.notes,
          items: request.body.items,
        })
        return reply.code(201).send(transfer)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /dough-transfers — listar envíos de/para la sucursal actual
  fastify.get<{ Querystring: ListQuery }>(
    '/',
    {
      schema: {
        tags: ['dough-transfers'],
        summary: 'Listar envíos de masas de/para la sucursal actual',
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['IN_TRANSIT', 'RECEIVED'] },
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
        },
        response: { 200: { type: 'array', items: transferSchema } },
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
        const repo = new PrismaDoughTransferRepository(db, schema)
        const listTransfers = createListDoughTransfersUseCase({ doughTransferRepository: repo })
        return listTransfers({
          branchId: branch_id,
          status: request.query.status as DoughTransferStatus | undefined,
          from: request.query.from ? new Date(request.query.from) : undefined,
          to: request.query.to ? new Date(request.query.to) : undefined,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )
}
