import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { DishIngredientBehavior } from '../../domain/entities/dish-ingredient'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaDishIngredientRepository } from '../../infrastructure/database/repositories/prisma-dish-ingredient-repository'
import { PrismaDishRepository } from '../../infrastructure/database/repositories/prisma-dish-repository'
import { PrismaIngredientRepository } from '../../infrastructure/database/repositories/prisma-ingredient-repository'
import { createListDishIngredientsUseCase } from '../../application/dish-ingredients/list-dish-ingredients.use-case'
import { createAddDishIngredientUseCase } from '../../application/dish-ingredients/add-dish-ingredient.use-case'
import { createUpdateDishIngredientUseCase } from '../../application/dish-ingredients/update-dish-ingredient.use-case'
import { createRemoveDishIngredientUseCase } from '../../application/dish-ingredients/remove-dish-ingredient.use-case'

interface AddBody {
  ingredientId: string
  baseQuantity: number
  behavior: string
  extraCost?: number | null
}

interface UpdateBody {
  baseQuantity: number
  behavior: string
  extraCost?: number | null
}

const behaviorEnum = Object.values(DishIngredientBehavior)

const dishIngredientResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    dishId: { type: 'string' },
    ingredientId: { type: 'string' },
    baseQuantity: { type: 'number' },
    behavior: { type: 'string', enum: behaviorEnum },
    extraCost: { type: 'number', nullable: true },
  },
}

export async function dishIngredientRoutes(fastify: FastifyInstance) {
  // GET /dishes/:dishId/ingredients
  fastify.get<{ Params: { dishId: string } }>(
    '/:dishId/ingredients',
    {
      schema: {
        tags: ['dish-ingredients'],
        summary: 'Listar insumos de un platillo',
        params: { type: 'object', required: ['dishId'], properties: { dishId: { type: 'string' } } },
        response: { 200: { type: 'array', items: dishIngredientResponseSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const diRepo = new PrismaDishIngredientRepository(db, schema)
        const dishRepo = new PrismaDishRepository(db, schema)
        return createListDishIngredientsUseCase({ dishIngredientRepository: diRepo, dishRepository: dishRepo })(request.params.dishId)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // POST /dishes/:dishId/ingredients
  fastify.post<{ Params: { dishId: string }; Body: AddBody }>(
    '/:dishId/ingredients',
    {
      schema: {
        tags: ['dish-ingredients'],
        summary: 'Agregar insumo a un platillo',
        params: { type: 'object', required: ['dishId'], properties: { dishId: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['ingredientId', 'baseQuantity', 'behavior'],
          properties: {
            ingredientId: { type: 'string' },
            baseQuantity: { type: 'number', exclusiveMinimum: 0 },
            behavior: { type: 'string', enum: behaviorEnum },
            extraCost: { type: 'number', nullable: true },
          },
        },
        response: { 201: dishIngredientResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const diRepo = new PrismaDishIngredientRepository(db, schema)
        const dishRepo = new PrismaDishRepository(db, schema)
        const ingRepo = new PrismaIngredientRepository(db, schema)
        const result = await createAddDishIngredientUseCase({
          dishIngredientRepository: diRepo,
          dishRepository: dishRepo,
          ingredientRepository: ingRepo,
        })({
          dishId: request.params.dishId,
          ingredientId: request.body.ingredientId,
          baseQuantity: request.body.baseQuantity,
          behavior: request.body.behavior as typeof DishIngredientBehavior[keyof typeof DishIngredientBehavior],
          extraCost: request.body.extraCost ?? null,
        })
        return reply.code(201).send(result)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // PUT /dishes/:dishId/ingredients/:ingredientId
  fastify.put<{ Params: { dishId: string; ingredientId: string }; Body: UpdateBody }>(
    '/:dishId/ingredients/:ingredientId',
    {
      schema: {
        tags: ['dish-ingredients'],
        summary: 'Actualizar asociación insumo-platillo',
        params: {
          type: 'object',
          required: ['dishId', 'ingredientId'],
          properties: { dishId: { type: 'string' }, ingredientId: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['baseQuantity', 'behavior'],
          properties: {
            baseQuantity: { type: 'number', exclusiveMinimum: 0 },
            behavior: { type: 'string', enum: behaviorEnum },
            extraCost: { type: 'number', nullable: true },
          },
        },
        response: { 200: dishIngredientResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const diRepo = new PrismaDishIngredientRepository(db, schema)
        return createUpdateDishIngredientUseCase({ dishIngredientRepository: diRepo })(
          request.params.dishId,
          request.params.ingredientId,
          {
            baseQuantity: request.body.baseQuantity,
            behavior: request.body.behavior as typeof DishIngredientBehavior[keyof typeof DishIngredientBehavior],
            extraCost: request.body.extraCost ?? null,
          },
        )
      } finally {
        await db.$disconnect()
      }
    },
  )

  // DELETE /dishes/:dishId/ingredients/:ingredientId
  fastify.delete<{ Params: { dishId: string; ingredientId: string } }>(
    '/:dishId/ingredients/:ingredientId',
    {
      schema: {
        tags: ['dish-ingredients'],
        summary: 'Quitar insumo de un platillo',
        params: {
          type: 'object',
          required: ['dishId', 'ingredientId'],
          properties: { dishId: { type: 'string' }, ingredientId: { type: 'string' } },
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
        const diRepo = new PrismaDishIngredientRepository(db, schema)
        await createRemoveDishIngredientUseCase({ dishIngredientRepository: diRepo })(
          request.params.dishId,
          request.params.ingredientId,
        )
        return reply.code(204).send()
      } finally {
        await db.$disconnect()
      }
    },
  )
}
