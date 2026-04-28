import type { FastifyInstance } from 'fastify'
import { loginUseCase } from '../../shared/container'
import { Errors } from '../../shared/errors/app-error'
import type { JwtPayload } from '../plugins/jwt.plugin'

interface LoginBody {
  username: string
  password: string
  tenantId: string
}

interface RefreshBody {
  refresh_token: string
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Iniciar sesión',
        body: {
          type: 'object',
          required: ['username', 'password', 'tenantId'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 },
            tenantId: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              refresh_token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password, tenantId } = request.body
      const user = await loginUseCase(username, password, tenantId)

      const payload: JwtPayload = {
        user_id: user.id,
        tenant_id: user.tenantId,
        branch_id: user.branchId,
        role: user.role,
        type: 'access',
      }

      const access_token = fastify.jwt.sign(payload)
      const refresh_token = fastify.jwt.sign(
        { ...payload, type: 'refresh' } satisfies JwtPayload,
        { expiresIn: '7d' },
      )

      return reply.send({ access_token, refresh_token })
    },
  )

  fastify.post<{ Body: RefreshBody }>(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Renovar access token',
        body: {
          type: 'object',
          required: ['refresh_token'],
          properties: {
            refresh_token: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      let payload: JwtPayload
      try {
        payload = fastify.jwt.verify<JwtPayload>(request.body.refresh_token)
      } catch {
        throw Errors.unauthorized('Invalid or expired refresh token')
      }

      if (payload.type !== 'refresh') {
        throw Errors.unauthorized('Invalid token type')
      }

      const access_token = fastify.jwt.sign({
        user_id: payload.user_id,
        tenant_id: payload.tenant_id,
        branch_id: payload.branch_id,
        role: payload.role,
        type: 'access',
      } satisfies JwtPayload)

      return reply.send({ access_token })
    },
  )
}
