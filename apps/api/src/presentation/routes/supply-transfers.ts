import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaSupplyTransferRepository } from '../../infrastructure/database/repositories/prisma-supply-transfer-repository'
import { PrismaSupplyTypeRepository } from '../../infrastructure/database/repositories/prisma-supply-type-repository'
import { createCreateSupplyTransferUseCase } from '../../application/supply-transfers/create-supply-transfer.use-case'
import { createListSupplyTransfersUseCase } from '../../application/supply-transfers/list-supply-transfers.use-case'
import { createReceiveSupplyTransferUseCase } from '../../application/supply-transfers/receive-supply-transfer.use-case'
import { UserRole } from '../../domain/entities/user'
import { SupplyTransferStatus } from '../../domain/entities/supply-transfer'
import { Errors } from '../../shared/errors/app-error'

interface CreateBody {
  toBranchId: string
  transferDate: string
  items: { supplyType: string; quantitySent: number; notes?: string | null }[]
  notes?: string | null
}

interface ListQuery {
  status?: string
  from?: string
  to?: string
}

interface ReceiveBody {
  items: { supplyType: string; quantityReceived: number; notes?: string | null }[]
  notes?: string | null
}

const itemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    transferId: { type: 'string' },
    supplyType: { type: 'string' },
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

export async function supplyTransferRoutes(fastify: FastifyInstance) {
  // POST /supply-transfers — registrar envío de masas (solo ADMIN)
  fastify.post<{ Body: CreateBody }>(
    '/',
    {
      schema: {
        tags: ['supply-transfers'],
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
                required: ['supplyType', 'quantitySent'],
                properties: {
                  supplyType: { type: 'string', minLength: 1 },
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
        const repo = new PrismaSupplyTransferRepository(db, schema)
        const supplyTypeRepo = new PrismaSupplyTypeRepository(db, schema)
        const createTransfer = createCreateSupplyTransferUseCase({ supplyTransferRepository: repo, supplyTypeRepository: supplyTypeRepo })
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

  // PATCH /supply-transfers/:id/receive — confirmar recepción de masas (ADMIN sucursal destino)
  fastify.patch<{ Params: { id: string }; Body: ReceiveBody }>(
    '/:id/receive',
    {
      schema: {
        tags: ['supply-transfers'],
        summary: 'Confirmar recepción de masas',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['items'],
          properties: {
            notes: { type: 'string' },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['supplyType', 'quantityReceived'],
                properties: {
                  supplyType: { type: 'string', minLength: 1 },
                  quantityReceived: { type: 'integer', minimum: 0 },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        response: { 200: transferSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const { tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaSupplyTransferRepository(db, schema)
        const receiveTransfer = createReceiveSupplyTransferUseCase({ supplyTransferRepository: repo })
        return receiveTransfer({
          transferId: request.params.id,
          receivingBranchId: branch_id,
          items: request.body.items,
          notes: request.body.notes,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /supply-transfers — listar envíos de/para la sucursal actual
  fastify.get<{ Querystring: ListQuery }>(
    '/',
    {
      schema: {
        tags: ['supply-transfers'],
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
        const repo = new PrismaSupplyTransferRepository(db, schema)
        const listTransfers = createListSupplyTransfersUseCase({ supplyTransferRepository: repo })
        return listTransfers({
          branchId: branch_id,
          status: request.query.status as SupplyTransferStatus | undefined,
          from: request.query.from ? new Date(request.query.from) : undefined,
          to: request.query.to ? new Date(request.query.to) : undefined,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )
}
