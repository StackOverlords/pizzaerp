import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaSupplyTypeRepository } from '../../infrastructure/database/repositories/prisma-supply-type-repository'
import { createCreateSupplyTypeUseCase } from '../../application/supply-types/create-supply-type.use-case'
import { createListSupplyTypesUseCase } from '../../application/supply-types/list-supply-types.use-case'
import { createUpdateSupplyTypeUseCase } from '../../application/supply-types/update-supply-type.use-case'
import { createDeactivateSupplyTypeUseCase } from '../../application/supply-types/deactivate-supply-type.use-case'
import { UserRole } from '../../domain/entities/user'

const supplyTypeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    active: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

export async function supplyTypeRoutes(fastify: FastifyInstance) {
  // GET /supply-types — listar todos los tipos (ADMIN)
  fastify.get('/', {
    schema: {
      tags: ['supply-types'],
      summary: 'Listar tipos de insumo del tenant',
      response: { 200: { type: 'array', items: supplyTypeSchema } },
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authenticate, authorize([UserRole.ADMIN])],
  }, async (request) => {
    const { tenant_id } = request.user
    const schema = await resolveTenantSchema(tenant_id)
    const db = createTenantClient(schema)
    try {
      const repo = new PrismaSupplyTypeRepository(db, schema)
      return createListSupplyTypesUseCase({ supplyTypeRepository: repo })()
    } finally {
      await db.$disconnect()
    }
  })

  // POST /supply-types — crear tipo de insumo (ADMIN)
  fastify.post<{ Body: { name: string } }>('/', {
    schema: {
      tags: ['supply-types'],
      summary: 'Crear tipo de insumo',
      body: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', minLength: 1 } },
      },
      response: { 201: supplyTypeSchema },
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authenticate, authorize([UserRole.ADMIN])],
  }, async (request, reply) => {
    const { tenant_id } = request.user
    const schema = await resolveTenantSchema(tenant_id)
    const db = createTenantClient(schema)
    try {
      const repo = new PrismaSupplyTypeRepository(db, schema)
      const result = await createCreateSupplyTypeUseCase({ supplyTypeRepository: repo })({ name: request.body.name })
      return reply.code(201).send(result)
    } finally {
      await db.$disconnect()
    }
  })

  // PUT /supply-types/:id — actualizar nombre (ADMIN)
  fastify.put<{ Params: { id: string }; Body: { name: string } }>('/:id', {
    schema: {
      tags: ['supply-types'],
      summary: 'Actualizar tipo de insumo',
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', minLength: 1 } },
      },
      response: { 200: supplyTypeSchema },
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authenticate, authorize([UserRole.ADMIN])],
  }, async (request) => {
    const { tenant_id } = request.user
    const schema = await resolveTenantSchema(tenant_id)
    const db = createTenantClient(schema)
    try {
      const repo = new PrismaSupplyTypeRepository(db, schema)
      return createUpdateSupplyTypeUseCase({ supplyTypeRepository: repo })({ id: request.params.id, name: request.body.name })
    } finally {
      await db.$disconnect()
    }
  })

  // PATCH /supply-types/:id/deactivate — desactivar (ADMIN)
  fastify.patch<{ Params: { id: string } }>('/:id/deactivate', {
    schema: {
      tags: ['supply-types'],
      summary: 'Desactivar tipo de insumo',
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      response: { 200: supplyTypeSchema },
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authenticate, authorize([UserRole.ADMIN])],
  }, async (request) => {
    const { tenant_id } = request.user
    const schema = await resolveTenantSchema(tenant_id)
    const db = createTenantClient(schema)
    try {
      const repo = new PrismaSupplyTypeRepository(db, schema)
      return createDeactivateSupplyTypeUseCase({ supplyTypeRepository: repo })(request.params.id)
    } finally {
      await db.$disconnect()
    }
  })
}
