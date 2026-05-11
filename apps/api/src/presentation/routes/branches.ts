import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { branchRepository } from '../../shared/container'
import { prisma } from '../../infrastructure/database/prisma'
import { Errors } from '../../shared/errors/app-error'
import { createListBranchesUseCase } from '../../application/branches/list-branches.use-case'
import { createCreateBranchUseCase } from '../../application/branches/create-branch.use-case'
import { createUpdateBranchUseCase } from '../../application/branches/update-branch.use-case'
import { createDeleteBranchUseCase } from '../../application/branches/delete-branch.use-case'

const branchResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'ID único de la sucursal', example: 'clxyz123' },
    name: { type: 'string', description: 'Nombre de la sucursal', example: 'Sucursal Norte' },
    tenantId: { type: 'string', description: 'ID del tenant al que pertenece', example: 'clxyz456' },
  },
}

const branchBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, description: 'Nombre de la sucursal', example: 'Sucursal Norte' },
  },
}

const notFoundSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 404 },
    code: { type: 'string', example: 'NOT_FOUND' },
    message: { type: 'string', example: 'Branch not found' },
  },
}

export async function branchRoutes(fastify: FastifyInstance) {
  const listBranches = createListBranchesUseCase({ branchRepository })
  const createBranch = createCreateBranchUseCase({ branchRepository, db: prisma })
  const updateBranch = createUpdateBranchUseCase({ branchRepository })
  const deleteBranch = createDeleteBranchUseCase({ branchRepository })

  // GET /branches — lista todas las sucursales del tenant
  fastify.get(
    '/',
    {
      schema: {
        tags: ['branches'],
        summary: 'Listar sucursales del tenant',
        response: { 200: { type: 'array', items: branchResponseSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      return listBranches(request.user.tenant_id)
    },
  )

  // GET /branches/:id — detalle de una sucursal
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['branches'],
        summary: 'Obtener sucursal por ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID de la sucursal', example: 'clxyz123' } },
        },
        response: {
          200: branchResponseSchema,
          404: notFoundSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const branch = await branchRepository.findById(request.params.id, request.user.tenant_id)
      if (!branch) throw Errors.notFound('Branch not found')
      return branch
    },
  )

  // POST /branches — crea una nueva sucursal
  fastify.post<{ Body: { name: string } }>(
    '/',
    {
      schema: {
        tags: ['branches'],
        summary: 'Crear sucursal',
        body: branchBodySchema,
        response: {
          201: branchResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const branch = await createBranch(request.body.name, request.user.tenant_id)
      return reply.code(201).send(branch)
    },
  )

  // PATCH /branches/:id — actualiza nombre de la sucursal
  fastify.patch<{ Params: { id: string }; Body: { name: string } }>(
    '/:id',
    {
      schema: {
        tags: ['branches'],
        summary: 'Actualizar nombre de sucursal',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID de la sucursal', example: 'clxyz123' } },
        },
        body: branchBodySchema,
        response: {
          200: branchResponseSchema,
          404: notFoundSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      return updateBranch(request.params.id, request.user.tenant_id, request.body.name)
    },
  )

  // DELETE /branches/:id — elimina la sucursal
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['branches'],
        summary: 'Eliminar sucursal',
        description: 'Elimina la sucursal. No se puede eliminar si tiene turnos abiertos.',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID de la sucursal', example: 'clxyz123' } },
        },
        response: {
          204: { type: 'null', description: 'Sucursal eliminada' },
          404: notFoundSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      await deleteBranch(request.params.id, request.user.tenant_id)
      return reply.code(204).send()
    },
  )
}
