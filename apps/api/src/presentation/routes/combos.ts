import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaComboRepository } from '../../infrastructure/database/repositories/prisma-combo-repository'
import { PrismaDishRepository } from '../../infrastructure/database/repositories/prisma-dish-repository'
import { createListCombosUseCase } from '../../application/combos/list-combos.use-case'
import { createGetComboUseCase } from '../../application/combos/get-combo.use-case'
import { createCreateComboUseCase } from '../../application/combos/create-combo.use-case'
import { createUpdateComboUseCase } from '../../application/combos/update-combo.use-case'
import { createDeactivateComboUseCase } from '../../application/combos/deactivate-combo.use-case'
import { createAddComboSlotUseCase } from '../../application/combos/add-combo-slot.use-case'
import { createUpdateComboSlotUseCase } from '../../application/combos/update-combo-slot.use-case'
import { createRemoveComboSlotUseCase } from '../../application/combos/remove-combo-slot.use-case'
import { createAddSlotOptionUseCase } from '../../application/combos/add-slot-option.use-case'
import { createRemoveSlotOptionUseCase } from '../../application/combos/remove-slot-option.use-case'

interface ComboBody {
  name: string
  description?: string | null
  salePrice: number
  availableFrom?: string | null
  availableTo?: string | null
}

interface SlotBody {
  name: string
  categoryId?: string | null
  required: boolean
  orderIndex: number
}

const comboBodySchema = {
  type: 'object',
  required: ['name', 'salePrice'],
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', nullable: true },
    salePrice: { type: 'number', exclusiveMinimum: 0 },
    availableFrom: { type: 'string', nullable: true },
    availableTo: { type: 'string', nullable: true },
  },
}

const slotBodySchema = {
  type: 'object',
  required: ['name', 'required', 'orderIndex'],
  properties: {
    name: { type: 'string', minLength: 1 },
    categoryId: { type: 'string', nullable: true },
    required: { type: 'boolean' },
    orderIndex: { type: 'integer', minimum: 0 },
  },
}

const optionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    slotId: { type: 'string' },
    dishId: { type: 'string' },
  },
}

const slotSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    comboId: { type: 'string' },
    name: { type: 'string' },
    categoryId: { type: 'string', nullable: true },
    required: { type: 'boolean' },
    orderIndex: { type: 'number' },
    options: { type: 'array', items: optionSchema },
  },
}

const comboResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    salePrice: { type: 'number' },
    active: { type: 'boolean' },
    availableFrom: { type: 'string', nullable: true },
    availableTo: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

const comboDetailResponseSchema = {
  ...comboResponseSchema,
  properties: {
    ...comboResponseSchema.properties,
    slots: { type: 'array', items: slotSchema },
  },
}

function makeRepo(schema: string, db: ReturnType<typeof createTenantClient>) {
  return new PrismaComboRepository(db, schema)
}

export async function comboRoutes(fastify: FastifyInstance) {
  // ─── Combos ────────────────────────────────────────────────────────────────

  fastify.get<{ Querystring: { activeOnly?: string } }>(
    '/',
    {
      schema: {
        tags: ['combos'], summary: 'Listar combos',
        querystring: { type: 'object', properties: { activeOnly: { type: 'string', enum: ['true', 'false'] } } },
        response: { 200: { type: 'array', items: comboResponseSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        return createListCombosUseCase({ comboRepository: makeRepo(schema, db) })(request.query.activeOnly === 'true')
      } finally { await db.$disconnect() }
    },
  )

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['combos'], summary: 'Obtener combo con slots y opciones',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: comboDetailResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        return createGetComboUseCase({ comboRepository: makeRepo(schema, db) })(request.params.id)
      } finally { await db.$disconnect() }
    },
  )

  fastify.post<{ Body: ComboBody }>(
    '/',
    {
      schema: {
        tags: ['combos'], summary: 'Crear combo',
        body: comboBodySchema,
        response: { 201: comboResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const combo = await createCreateComboUseCase({ comboRepository: makeRepo(schema, db) })({
          name: request.body.name,
          description: request.body.description ?? null,
          salePrice: request.body.salePrice,
          availableFrom: request.body.availableFrom ?? null,
          availableTo: request.body.availableTo ?? null,
        })
        return reply.code(201).send(combo)
      } finally { await db.$disconnect() }
    },
  )

  fastify.put<{ Params: { id: string }; Body: ComboBody }>(
    '/:id',
    {
      schema: {
        tags: ['combos'], summary: 'Actualizar combo',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: comboBodySchema,
        response: { 200: comboResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        return createUpdateComboUseCase({ comboRepository: makeRepo(schema, db) })(request.params.id, {
          name: request.body.name,
          description: request.body.description ?? null,
          salePrice: request.body.salePrice,
          availableFrom: request.body.availableFrom ?? null,
          availableTo: request.body.availableTo ?? null,
        })
      } finally { await db.$disconnect() }
    },
  )

  fastify.patch<{ Params: { id: string } }>(
    '/:id/deactivate',
    {
      schema: {
        tags: ['combos'], summary: 'Desactivar combo',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: comboResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        return createDeactivateComboUseCase({ comboRepository: makeRepo(schema, db) })(request.params.id)
      } finally { await db.$disconnect() }
    },
  )

  // ─── Slots ────────────────────────────────────────────────────────────────

  fastify.post<{ Params: { comboId: string }; Body: SlotBody }>(
    '/:comboId/slots',
    {
      schema: {
        tags: ['combos'], summary: 'Agregar slot a combo',
        params: { type: 'object', required: ['comboId'], properties: { comboId: { type: 'string' } } },
        body: slotBodySchema,
        response: { 201: slotSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const slot = await createAddComboSlotUseCase({ comboRepository: makeRepo(schema, db) })({
          comboId: request.params.comboId,
          name: request.body.name,
          categoryId: request.body.categoryId ?? null,
          required: request.body.required,
          orderIndex: request.body.orderIndex,
        })
        return reply.code(201).send(slot)
      } finally { await db.$disconnect() }
    },
  )

  fastify.put<{ Params: { comboId: string; slotId: string }; Body: SlotBody }>(
    '/:comboId/slots/:slotId',
    {
      schema: {
        tags: ['combos'], summary: 'Actualizar slot',
        params: { type: 'object', required: ['comboId', 'slotId'], properties: { comboId: { type: 'string' }, slotId: { type: 'string' } } },
        body: slotBodySchema,
        response: { 200: slotSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        return createUpdateComboSlotUseCase({ comboRepository: makeRepo(schema, db) })(request.params.slotId, {
          name: request.body.name,
          categoryId: request.body.categoryId ?? null,
          required: request.body.required,
          orderIndex: request.body.orderIndex,
        })
      } finally { await db.$disconnect() }
    },
  )

  fastify.delete<{ Params: { comboId: string; slotId: string } }>(
    '/:comboId/slots/:slotId',
    {
      schema: {
        tags: ['combos'], summary: 'Eliminar slot (y sus opciones)',
        params: { type: 'object', required: ['comboId', 'slotId'], properties: { comboId: { type: 'string' }, slotId: { type: 'string' } } },
        response: { 204: { type: 'null' } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        await createRemoveComboSlotUseCase({ comboRepository: makeRepo(schema, db) })(request.params.slotId)
        return reply.code(204).send()
      } finally { await db.$disconnect() }
    },
  )

  // ─── Slot options ─────────────────────────────────────────────────────────

  fastify.post<{ Params: { comboId: string; slotId: string }; Body: { dishId: string } }>(
    '/:comboId/slots/:slotId/options',
    {
      schema: {
        tags: ['combos'], summary: 'Agregar platillo como opción de un slot',
        params: { type: 'object', required: ['comboId', 'slotId'], properties: { comboId: { type: 'string' }, slotId: { type: 'string' } } },
        body: { type: 'object', required: ['dishId'], properties: { dishId: { type: 'string' } } },
        response: { 201: optionSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const option = await createAddSlotOptionUseCase({
          comboRepository: makeRepo(schema, db),
          dishRepository: new PrismaDishRepository(db, schema),
        })(request.params.slotId, request.body.dishId)
        return reply.code(201).send(option)
      } finally { await db.$disconnect() }
    },
  )

  fastify.delete<{ Params: { comboId: string; slotId: string; dishId: string } }>(
    '/:comboId/slots/:slotId/options/:dishId',
    {
      schema: {
        tags: ['combos'], summary: 'Quitar platillo de un slot',
        params: {
          type: 'object',
          required: ['comboId', 'slotId', 'dishId'],
          properties: { comboId: { type: 'string' }, slotId: { type: 'string' }, dishId: { type: 'string' } },
        },
        response: { 204: { type: 'null' } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        await createRemoveSlotOptionUseCase({ comboRepository: makeRepo(schema, db) })(
          request.params.slotId, request.params.dishId,
        )
        return reply.code(204).send()
      } finally { await db.$disconnect() }
    },
  )
}
