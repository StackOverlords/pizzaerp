import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaDishRepository } from '../../infrastructure/database/repositories/prisma-dish-repository'
import { createListDishesUseCase } from '../../application/dishes/list-dishes.use-case'
import { createGetDishUseCase } from '../../application/dishes/get-dish.use-case'
import { createCreateDishUseCase } from '../../application/dishes/create-dish.use-case'
import { createUpdateDishUseCase } from '../../application/dishes/update-dish.use-case'
import { createDeactivateDishUseCase } from '../../application/dishes/deactivate-dish.use-case'
import { createCloneDishUseCase } from '../../application/dishes/clone-dish.use-case'
import { PrismaDishIngredientRepository } from '../../infrastructure/database/repositories/prisma-dish-ingredient-repository'

interface DishBody {
  categoryId?: string | null
  name: string
  description?: string | null
  salePrice: number
  imageUrl?: string | null
  availableFrom?: string | null
  availableTo?: string | null
}

const dishBodySchema = {
  type: 'object',
  required: ['name', 'salePrice'],
  properties: {
    categoryId: { type: 'string', nullable: true },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', nullable: true },
    salePrice: { type: 'number', exclusiveMinimum: 0 },
    imageUrl: { type: 'string', nullable: true },
    availableFrom: { type: 'string', nullable: true },
    availableTo: { type: 'string', nullable: true },
  },
}

const dishResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    categoryId: { type: 'string', nullable: true },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    salePrice: { type: 'number' },
    imageUrl: { type: 'string', nullable: true },
    active: { type: 'boolean' },
    availableFrom: { type: 'string', nullable: true },
    availableTo: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
}

export async function dishRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { activeOnly?: string; categoryId?: string; availableAt?: string } }>(
    '/',
    {
      schema: {
        tags: ['dishes'],
        summary: 'Listar platillos',
        querystring: {
          type: 'object',
          properties: {
            activeOnly: { type: 'string', enum: ['true', 'false'] },
            categoryId: { type: 'string' },
            availableAt: { type: 'string', description: 'Filtrar por horario disponible, ej: 12:30' },
          },
        },
        response: { 200: { type: 'array', items: dishResponseSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDishRepository(db, schema)
        return createListDishesUseCase({ dishRepository: repo })({
          activeOnly: request.query.activeOnly === 'true',
          categoryId: request.query.categoryId,
          availableAt: request.query.availableAt,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['dishes'],
        summary: 'Obtener platillo por ID',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: dishResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDishRepository(db, schema)
        return createGetDishUseCase({ dishRepository: repo })(request.params.id)
      } finally {
        await db.$disconnect()
      }
    },
  )

  fastify.post<{ Body: DishBody }>(
    '/',
    {
      schema: {
        tags: ['dishes'],
        summary: 'Crear platillo',
        body: dishBodySchema,
        response: { 201: dishResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDishRepository(db, schema)
        const dish = await createCreateDishUseCase({ dishRepository: repo })({
          categoryId: request.body.categoryId ?? null,
          name: request.body.name,
          description: request.body.description ?? null,
          salePrice: request.body.salePrice,
          imageUrl: request.body.imageUrl ?? null,
          availableFrom: request.body.availableFrom ?? null,
          availableTo: request.body.availableTo ?? null,
        })
        return reply.code(201).send(dish)
      } finally {
        await db.$disconnect()
      }
    },
  )

  fastify.put<{ Params: { id: string }; Body: DishBody }>(
    '/:id',
    {
      schema: {
        tags: ['dishes'],
        summary: 'Actualizar platillo',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: dishBodySchema,
        response: { 200: dishResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDishRepository(db, schema)
        return createUpdateDishUseCase({ dishRepository: repo })(request.params.id, {
          categoryId: request.body.categoryId ?? null,
          name: request.body.name,
          description: request.body.description ?? null,
          salePrice: request.body.salePrice,
          imageUrl: request.body.imageUrl ?? null,
          availableFrom: request.body.availableFrom ?? null,
          availableTo: request.body.availableTo ?? null,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )

  // POST /dishes/:id/clone
  fastify.post<{ Params: { id: string }; Body: { name?: string } }>(
    '/:id/clone',
    {
      schema: {
        tags: ['dishes'],
        summary: 'Clonar platillo (copia campos e insumos)',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: { name: { type: 'string', minLength: 1 } },
        },
        response: { 201: dishResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const dish = await createCloneDishUseCase({
          dishRepository: new PrismaDishRepository(db, schema),
          dishIngredientRepository: new PrismaDishIngredientRepository(db, schema),
        })(request.params.id, request.body.name)
        return reply.code(201).send(dish)
      } finally {
        await db.$disconnect()
      }
    },
  )

  fastify.patch<{ Params: { id: string } }>(
    '/:id/deactivate',
    {
      schema: {
        tags: ['dishes'],
        summary: 'Desactivar platillo',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: dishResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDishRepository(db, schema)
        return createDeactivateDishUseCase({ dishRepository: repo })(request.params.id)
      } finally {
        await db.$disconnect()
      }
    },
  )
}
