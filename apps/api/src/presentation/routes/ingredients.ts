import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaIngredientRepository } from '../../infrastructure/database/repositories/prisma-ingredient-repository'
import { createListIngredientsUseCase } from '../../application/ingredients/list-ingredients.use-case'
import { createGetIngredientUseCase } from '../../application/ingredients/get-ingredient.use-case'
import { createCreateIngredientUseCase } from '../../application/ingredients/create-ingredient.use-case'
import { createUpdateIngredientUseCase } from '../../application/ingredients/update-ingredient.use-case'
import { createDeactivateIngredientUseCase } from '../../application/ingredients/deactivate-ingredient.use-case'

interface IngredientBody {
  name: string
  purchaseUnit: string
  consumptionUnit: string
  conversionFactor: number
  wastagePercentage: number
}

const ingredientBodySchema = {
  type: 'object',
  required: ['name', 'purchaseUnit', 'consumptionUnit', 'conversionFactor', 'wastagePercentage'],
  properties: {
    name: { type: 'string', minLength: 1 },
    purchaseUnit: { type: 'string', minLength: 1 },
    consumptionUnit: { type: 'string', minLength: 1 },
    conversionFactor: { type: 'number', exclusiveMinimum: 0 },
    wastagePercentage: { type: 'number', minimum: 0, maximum: 100 },
  },
}

const ingredientResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    purchaseUnit: { type: 'string' },
    consumptionUnit: { type: 'string' },
    conversionFactor: { type: 'number' },
    wastagePercentage: { type: 'number' },
    active: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

export async function ingredientRoutes(fastify: FastifyInstance) {
  // GET /ingredients — list all (optionally only active)
  fastify.get<{ Querystring: { activeOnly?: string } }>(
    '/',
    {
      schema: {
        tags: ['ingredients'],
        summary: 'Listar insumos',
        querystring: {
          type: 'object',
          properties: { activeOnly: { type: 'string', enum: ['true', 'false'] } },
        },
        response: { 200: { type: 'array', items: ingredientResponseSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaIngredientRepository(db, schema)
        const listIngredients = createListIngredientsUseCase({ ingredientRepository: repo })
        return listIngredients(request.query.activeOnly === 'true')
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /ingredients/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['ingredients'],
        summary: 'Obtener insumo por ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: ingredientResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaIngredientRepository(db, schema)
        const getIngredient = createGetIngredientUseCase({ ingredientRepository: repo })
        return getIngredient(request.params.id)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // POST /ingredients — create (ADMIN only)
  fastify.post<{ Body: IngredientBody }>(
    '/',
    {
      schema: {
        tags: ['ingredients'],
        summary: 'Crear insumo',
        body: ingredientBodySchema,
        response: { 201: ingredientResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaIngredientRepository(db, schema)
        const createIngredient = createCreateIngredientUseCase({ ingredientRepository: repo })
        const ingredient = await createIngredient(request.body)
        return reply.code(201).send(ingredient)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // PUT /ingredients/:id — full update (ADMIN only)
  fastify.put<{ Params: { id: string }; Body: IngredientBody }>(
    '/:id',
    {
      schema: {
        tags: ['ingredients'],
        summary: 'Actualizar insumo',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: ingredientBodySchema,
        response: { 200: ingredientResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaIngredientRepository(db, schema)
        const updateIngredient = createUpdateIngredientUseCase({ ingredientRepository: repo })
        return updateIngredient(request.params.id, request.body)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // PATCH /ingredients/:id/deactivate — soft delete (ADMIN only)
  fastify.patch<{ Params: { id: string } }>(
    '/:id/deactivate',
    {
      schema: {
        tags: ['ingredients'],
        summary: 'Desactivar insumo',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: ingredientResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaIngredientRepository(db, schema)
        const deactivateIngredient = createDeactivateIngredientUseCase({ ingredientRepository: repo })
        return deactivateIngredient(request.params.id)
      } finally {
        await db.$disconnect()
      }
    },
  )
}
