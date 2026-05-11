import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { userRepository, branchRepository } from '../../shared/container'
import { prisma } from '../../infrastructure/database/prisma'
import { bcryptService } from '../../infrastructure/auth/bcrypt.service'
import { Errors } from '../../shared/errors/app-error'
import { createListTenantUsersUseCase } from '../../application/users/list-tenant-users.use-case'
import { createCreateTenantUserUseCase } from '../../application/users/create-tenant-user.use-case'
import { createUpdateTenantUserUseCase } from '../../application/users/update-tenant-user.use-case'
import { createDeleteTenantUserUseCase } from '../../application/users/delete-tenant-user.use-case'

const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'ID único del usuario', example: 'clxyz123' },
    username: { type: 'string', description: 'Nombre de usuario', example: 'cajero01' },
    role: { type: 'string', enum: Object.values(UserRole), description: 'Rol del usuario', example: 'CAJERO' },
    branchId: { type: ['string', 'null'], description: 'ID de la sucursal asignada', example: 'clxyz456' },
    createdAt: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
  },
}

const notFoundSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 404 },
    code: { type: 'string', example: 'NOT_FOUND' },
    message: { type: 'string', example: 'User not found' },
  },
}

export async function userRoutes(fastify: FastifyInstance) {
  const listUsers = createListTenantUsersUseCase({ userRepository })
  const createUser = createCreateTenantUserUseCase({ userRepository, branchRepository, db: prisma, hashPassword: bcryptService.hash })
  const updateUser = createUpdateTenantUserUseCase({ userRepository, branchRepository })
  const deleteUser = createDeleteTenantUserUseCase({ userRepository })

  // GET /users — lista usuarios del tenant
  fastify.get(
    '/',
    {
      schema: {
        tags: ['users'],
        summary: 'Listar usuarios del tenant',
        response: { 200: { type: 'array', items: userResponseSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const users = await listUsers(request.user.tenant_id)
      return users.map(({ id, username, role, branchId, createdAt }) => ({ id, username, role, branchId, createdAt }))
    },
  )

  // POST /users — crea un usuario en el tenant
  fastify.post<{
    Body: {
      username: string
      password: string
      role?: string
      branchId?: string
    }
  }>(
    '/',
    {
      schema: {
        tags: ['users'],
        summary: 'Crear usuario en el tenant',
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, description: 'Nombre de usuario', example: 'cajero01' },
            password: { type: 'string', minLength: 6, description: 'Contraseña del usuario', example: 'secreto123' },
            role: { type: 'string', enum: Object.values(UserRole), description: 'Rol del usuario (default: ADMIN)', example: 'CAJERO' },
            branchId: { type: 'string', description: 'ID de la sucursal asignada (opcional)', example: 'clxyz456' },
          },
        },
        response: { 201: userResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const { username, password, role, branchId } = request.body
      const user = await createUser({
        username,
        password,
        role: role as UserRole | undefined,
        branchId: branchId ?? null,
        tenantId: request.user.tenant_id,
      })
      const { id, createdAt } = user
      return reply.code(201).send({ id, username: user.username, role: user.role, branchId: user.branchId, createdAt })
    },
  )

  // PATCH /users/:id — actualiza role y/o branchId
  fastify.patch<{
    Params: { id: string }
    Body: { role?: string; branchId?: string | null }
  }>(
    '/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Actualizar rol o sucursal de un usuario',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del usuario', example: 'clxyz123' } },
        },
        body: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: Object.values(UserRole), description: 'Nuevo rol del usuario', example: 'CAJERO' },
            branchId: { type: ['string', 'null'], description: 'ID de la nueva sucursal (null para desasignar)', example: 'clxyz456' },
          },
        },
        response: {
          200: userResponseSchema,
          404: notFoundSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const { id } = request.params
      if (request.user.user_id === id) {
        throw Errors.forbidden('No puedes modificar tu propio usuario')
      }
      const { role, branchId } = request.body
      const user = await updateUser(id, request.user.tenant_id, {
        role: role as UserRole | undefined,
        branchId,
      })
      return { id: user.id, username: user.username, role: user.role, branchId: user.branchId, createdAt: user.createdAt }
    },
  )

  // DELETE /users/:id — elimina un usuario del tenant
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Eliminar usuario del tenant',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del usuario', example: 'clxyz123' } },
        },
        response: {
          204: { type: 'null', description: 'Usuario eliminado' },
          404: notFoundSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const { id } = request.params
      if (request.user.user_id === id) {
        throw Errors.forbidden('No puedes eliminar tu propio usuario')
      }
      await deleteUser(id, request.user.tenant_id)
      return reply.code(204).send()
    },
  )
}
