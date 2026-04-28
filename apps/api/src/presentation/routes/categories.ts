import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaCategoryRepository } from '../../infrastructure/database/repositories/prisma-category-repository'
import { createListCategoriesUseCase } from '../../application/categories/list-categories.use-case'
import { createGetCategoryUseCase } from '../../application/categories/get-category.use-case'
import { createCreateCategoryUseCase } from '../../application/categories/create-category.use-case'
import { createUpdateCategoryUseCase } from '../../application/categories/update-category.use-case'
import { createDeactivateCategoryUseCase } from '../../application/categories/deactivate-category.use-case'

interface CategoryBody {
  name: string
  orderIndex: number
}

const categoryBodySchema = {
  type: 'object',
  required: ['name', 'orderIndex'],
  properties: {
    name: { type: 'string', minLength: 1 },
    orderIndex: { type: 'integer', minimum: 0 },
  },
}

const categoryResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    orderIndex: { type: 'number' },
    active: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

export async function categoryRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { activeOnly?: string } }>(
    '/',
    {
      schema: {
        tags: ['categories'],
        summary: 'Listar categorías',
        querystring: {
          type: 'object',
          properties: { activeOnly: { type: 'string', enum: ['true', 'false'] } },
        },
        response: { 200: { type: 'array', items: categoryResponseSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaCategoryRepository(db, schema)
        return createListCategoriesUseCase({ categoryRepository: repo })(request.query.activeOnly === 'true')
      } finally {
        await db.$disconnect()
      }
    },
  )

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['categories'],
        summary: 'Obtener categoría por ID',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: categoryResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaCategoryRepository(db, schema)
        return createGetCategoryUseCase({ categoryRepository: repo })(request.params.id)
      } finally {
        await db.$disconnect()
      }
    },
  )

  fastify.post<{ Body: CategoryBody }>(
    '/',
    {
      schema: {
        tags: ['categories'],
        summary: 'Crear categoría',
        body: categoryBodySchema,
        response: { 201: categoryResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaCategoryRepository(db, schema)
        const category = await createCreateCategoryUseCase({ categoryRepository: repo })(request.body)
        return reply.code(201).send(category)
      } finally {
        await db.$disconnect()
      }
    },
  )

  fastify.put<{ Params: { id: string }; Body: CategoryBody }>(
    '/:id',
    {
      schema: {
        tags: ['categories'],
        summary: 'Actualizar categoría',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: categoryBodySchema,
        response: { 200: categoryResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaCategoryRepository(db, schema)
        return createUpdateCategoryUseCase({ categoryRepository: repo })(request.params.id, request.body)
      } finally {
        await db.$disconnect()
      }
    },
  )

  fastify.patch<{ Params: { id: string } }>(
    '/:id/deactivate',
    {
      schema: {
        tags: ['categories'],
        summary: 'Desactivar categoría',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: categoryResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const schema = await resolveTenantSchema(request.user.tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaCategoryRepository(db, schema)
        return createDeactivateCategoryUseCase({ categoryRepository: repo })(request.params.id)
      } finally {
        await db.$disconnect()
      }
    },
  )
}
