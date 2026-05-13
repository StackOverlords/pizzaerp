import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaOrderRepository } from '../../infrastructure/database/repositories/prisma-order-repository'
import { PrismaShiftRepository } from '../../infrastructure/database/repositories/prisma-shift-repository'
import { PrismaDishRepository } from '../../infrastructure/database/repositories/prisma-dish-repository'
import { PrismaPaymentRepository } from '../../infrastructure/database/repositories/prisma-payment-repository'
import { createCreateOrderUseCase } from '../../application/orders/create-order.use-case'
import { createGetOrderUseCase } from '../../application/orders/get-order.use-case'
import { createPayOrderUseCase } from '../../application/orders/pay-order.use-case'
import { createCancelOrderUseCase } from '../../application/orders/cancel-order.use-case'
import { createApplyDiscountUseCase } from '../../application/orders/apply-discount.use-case'
import { createListOrdersUseCase } from '../../application/orders/list-orders.use-case'
import { PrismaOrderCancellationRepository } from '../../infrastructure/database/repositories/prisma-order-cancellation-repository'
import { PrismaOrderDiscountRepository } from '../../infrastructure/database/repositories/prisma-order-discount-repository'
import { userRepository } from '../../shared/container'
import { Errors } from '../../shared/errors/app-error'
import { UserRole } from '../../domain/entities/user'

interface ListOrdersQuery {
  shiftId?: string
  status?: 'PENDING' | 'PAID' | 'CANCELLED'
  userId?: string
  branchId?: string
  from?: string
  to?: string
  page?: string
  limit?: string
  sortBy?: 'createdAt' | 'orderNumber' | 'total'
  sortOrder?: 'asc' | 'desc'
}

interface CreateOrderBody {
  items: Array<{
    dishId: string
    quantity: number
    notes?: string
  }>
  notes?: string
}

interface PayOrderBody {
  method: 'CASH' | 'QR'
  amount?: number
  reference?: string
}

interface CancelOrderBody {
  adminUsername: string
  adminPin: string
  reason?: string
}

interface ApplyDiscountBody {
  adminUsername: string
  adminPin: string
  type: 'AMOUNT' | 'PERCENTAGE'
  value: number
  reason?: string
}

const orderItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    orderId: { type: 'string' },
    dishId: { type: ['string', 'null'] },
    dishName: { type: 'string' },
    unitPrice: { type: 'number' },
    quantity: { type: 'number' },
    subtotal: { type: 'number' },
    notes: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

const orderResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    orderNumber: { type: 'number' },
    shiftId: { type: 'string' },
    branchId: { type: 'string' },
    userId: { type: 'string' },
    status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'] },
    subtotal: { type: 'number' },
    discountAmount: { type: 'number' },
    total: { type: 'number' },
    notes: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    items: { type: 'array', items: orderItemSchema },
  },
}

const orderHeaderResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    orderNumber: { type: 'number' },
    shiftId: { type: 'string' },
    branchId: { type: 'string' },
    userId: { type: 'string' },
    status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'] },
    subtotal: { type: 'number' },
    discountAmount: { type: 'number' },
    total: { type: 'number' },
    notes: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
}

const paginatedOrderResponseSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: orderHeaderResponseSchema },
    total: { type: 'number' },
    page: { type: 'number' },
    limit: { type: 'number' },
  },
}

const paymentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    orderId: { type: 'string' },
    method: { type: 'string', enum: ['CASH', 'QR'] },
    amount: { type: 'number' },
    changeAmount: { type: ['number', 'null'] },
    reference: { type: ['string', 'null'] },
    paidAt: { type: 'string', format: 'date-time' },
  },
}

const payOrderResponseSchema = {
  type: 'object',
  properties: {
    order: orderResponseSchema,
    payment: paymentSchema,
  },
}

export async function orderRoutes(fastify: FastifyInstance) {
  // POST /orders — registrar pedido en caja
  fastify.post<{ Body: CreateOrderBody }>(
    '/',
    {
      schema: {
        tags: ['orders'],
        summary: 'Registrar pedido en caja',
        body: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['dishId', 'quantity'],
                properties: {
                  dishId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  notes: { type: 'string' },
                },
              },
            },
            notes: { type: 'string' },
          },
        },
        response: { 201: orderResponseSchema },
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
        const orderRepo = new PrismaOrderRepository(db, schema)
        const shiftRepo = new PrismaShiftRepository(db, schema)
        const dishRepo = new PrismaDishRepository(db, schema)
        const createOrder = createCreateOrderUseCase({
          orderRepository: orderRepo,
          shiftRepository: shiftRepo,
          dishRepository: dishRepo,
        })
        const order = await createOrder({
          userId: user_id,
          branchId: branch_id,
          notes: request.body.notes,
          items: request.body.items,
        })
        return reply.code(201).send(order)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /orders — listar pedidos paginados con filtros
  fastify.get<{ Querystring: ListOrdersQuery }>(
    '/',
    {
      schema: {
        tags: ['orders'],
        summary: 'Listar pedidos paginados con filtros',
        querystring: {
          type: 'object',
          properties: {
            shiftId:   { type: 'string' },
            status:    { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'] },
            userId:    { type: 'string' },
            branchId:  { type: 'string' },
            from:      { type: 'string' },
            to:        { type: 'string' },
            page:      { type: 'string' },
            limit:     { type: 'string' },
            sortBy:    { type: 'string', enum: ['createdAt', 'orderNumber', 'total'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
        response: { 200: paginatedOrderResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const { role, branch_id: jwtBranchId, tenant_id } = request.user

      // CAJERO no puede pasar branchId ni userId como filtros
      if (role === UserRole.CAJERO) {
        if (request.query.branchId !== undefined)
          throw Errors.forbidden('El cajero no puede filtrar por sucursal')
        if (request.query.userId !== undefined)
          throw Errors.forbidden('El cajero no puede filtrar por usuario')
      }

      if (!jwtBranchId) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const effectiveBranchId =
        role === UserRole.ADMIN
          ? (request.query.branchId ?? jwtBranchId)
          : jwtBranchId

      const effectiveUserId =
        role === UserRole.ADMIN ? request.query.userId : undefined

      const page  = request.query.page  ? parseInt(request.query.page,  10) : undefined
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const orderRepo = new PrismaOrderRepository(db, schema)
        const listOrders = createListOrdersUseCase({ orderRepository: orderRepo })
        return listOrders({
          branchId: effectiveBranchId,
          shiftId:   request.query.shiftId,
          status:    request.query.status,
          userId:    effectiveUserId,
          from:      request.query.from,
          to:        request.query.to,
          page,
          limit,
          sortBy:    request.query.sortBy,
          sortOrder: request.query.sortOrder,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /orders/:id — obtener pedido con sus ítems
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['orders'],
        summary: 'Obtener pedido por ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: orderResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const { tenant_id } = request.user
      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const orderRepo = new PrismaOrderRepository(db, schema)
        const getOrder = createGetOrderUseCase({ orderRepository: orderRepo })
        return getOrder(request.params.id)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // PATCH /orders/:id/pay — cobrar pedido (CASH o QR)
  fastify.patch<{ Params: { id: string }; Body: PayOrderBody }>(
    '/:id/pay',
    {
      schema: {
        tags: ['orders'],
        summary: 'Cobrar pedido (CASH o QR)',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['method'],
          properties: {
            method: { type: 'string', enum: ['CASH', 'QR'] },
            amount: { type: 'number', minimum: 0 },
            reference: { type: 'string' },
          },
        },
        response: { 200: payOrderResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const { method, amount, reference } = request.body
      if (method === 'CASH' && amount === undefined) {
        throw Errors.badRequest('Se requiere el monto recibido para pago en efectivo')
      }

      const { tenant_id } = request.user
      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const orderRepo = new PrismaOrderRepository(db, schema)
        const paymentRepo = new PrismaPaymentRepository(db, schema)
        const payOrder = createPayOrderUseCase({ orderRepository: orderRepo, paymentRepository: paymentRepo })
        return payOrder({ orderId: request.params.id, method, amount: amount ?? 0, reference })
      } finally {
        await db.$disconnect()
      }
    },
  )

  // PATCH /orders/:id/cancel — cancelar pedido con PIN de administrador
  fastify.patch<{ Params: { id: string }; Body: CancelOrderBody }>(
    '/:id/cancel',
    {
      schema: {
        tags: ['orders'],
        summary: 'Cancelar pedido (requiere PIN de administrador)',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['adminUsername', 'adminPin'],
          properties: {
            adminUsername: { type: 'string', minLength: 1 },
            adminPin: { type: 'string', minLength: 4, maxLength: 6, pattern: '^\\d+$' },
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              order: orderResponseSchema,
              cancellation: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  orderId: { type: 'string' },
                  adminUserId: { type: 'string' },
                  cajeroUserId: { type: 'string' },
                  reason: { type: ['string', 'null'] },
                  cancelledAt: { type: 'string', format: 'date-time' },
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
      const { user_id, tenant_id } = request.user
      const { adminUsername, adminPin, reason } = request.body

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const orderRepo = new PrismaOrderRepository(db, schema)
        const cancellationRepo = new PrismaOrderCancellationRepository(db, schema)
        const cancelOrder = createCancelOrderUseCase({
          orderRepository: orderRepo,
          cancellationRepository: cancellationRepo,
          userRepository,
        })
        return cancelOrder({ orderId: request.params.id, cajeroUserId: user_id, tenantId: tenant_id, adminUsername, adminPin, reason })
      } finally {
        await db.$disconnect()
      }
    },
  )

  // PATCH /orders/:id/discount — aplicar descuento con PIN de administrador
  fastify.patch<{ Params: { id: string }; Body: ApplyDiscountBody }>(
    '/:id/discount',
    {
      schema: {
        tags: ['orders'],
        summary: 'Aplicar descuento (AMOUNT o PERCENTAGE) con PIN de administrador',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['adminUsername', 'adminPin', 'type', 'value'],
          properties: {
            adminUsername: { type: 'string', minLength: 1 },
            adminPin: { type: 'string', minLength: 4, maxLength: 6, pattern: '^\\d+$' },
            type: { type: 'string', enum: ['AMOUNT', 'PERCENTAGE'] },
            value: { type: 'number', exclusiveMinimum: 0 },
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              order: orderResponseSchema,
              discount: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  orderId: { type: 'string' },
                  adminUserId: { type: 'string' },
                  type: { type: 'string', enum: ['AMOUNT', 'PERCENTAGE'] },
                  value: { type: 'number' },
                  amount: { type: 'number' },
                  reason: { type: ['string', 'null'] },
                  appliedAt: { type: 'string', format: 'date-time' },
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
      const { user_id: _userId, tenant_id } = request.user
      const { adminUsername, adminPin, type, value, reason } = request.body

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const orderRepo = new PrismaOrderRepository(db, schema)
        const discountRepo = new PrismaOrderDiscountRepository(db, schema)
        const applyDiscount = createApplyDiscountUseCase({
          orderRepository: orderRepo,
          discountRepository: discountRepo,
          userRepository,
        })
        return applyDiscount({ orderId: request.params.id, tenantId: tenant_id, adminUsername, adminPin, type, value, reason })
      } finally {
        await db.$disconnect()
      }
    },
  )
}
