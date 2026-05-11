import type { FastifyInstance } from 'fastify'
import { loginUseCase, userRepository, tenantRepository } from '../../shared/container'
import { Errors } from '../../shared/errors/app-error'
import type { JwtPayload } from '../plugins/jwt.plugin'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { TenantStatus } from '../../domain/entities/tenant'
import { createSetPinUseCase } from '../../application/auth/set-pin.use-case'

interface LoginBody {
  username: string
  password: string
  slug?: string
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
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1, example: 'admin' },
            password: { type: 'string', minLength: 1, example: 'secreto123' },
            slug: { type: 'string', minLength: 1, maxLength: 60, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', description: 'Solo SaaS. Omitir en Client-VPS.', example: 'maxpizza' },
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
      const { username, password, slug } = request.body

      let tenant: Awaited<ReturnType<typeof tenantRepository.findBySlug>>

      if (slug) {
        tenant = await tenantRepository.findBySlug(slug)
      } else {
        // Client-VPS mode: auto-resolve when there is exactly one tenant
        const count = await tenantRepository.count()
        if (count !== 1) throw Errors.unauthorized('Invalid credentials')
        tenant = await tenantRepository.findFirst()
      }

      if (!tenant) throw Errors.unauthorized('Invalid credentials')

      if (tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.CANCELED) {
        throw Errors.unauthorized('Invalid credentials')
      }

      const user = await loginUseCase(username, password, tenant.id)

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

  // GET /auth/me — perfil del usuario autenticado
  fastify.get(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Perfil del usuario autenticado',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              role: { type: 'string' },
              branchId: { type: 'string', nullable: true },
              tenantId: { type: 'string' },
            },
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const user = await userRepository.findById(request.user.user_id)
      if (!user) throw Errors.unauthorized('User not found')
      return { id: user.id, username: user.username, role: user.role, branchId: user.branchId, tenantId: user.tenantId }
    },
  )

  // GET /auth/subscription — plan y uso actual del tenant
  fastify.get(
    '/subscription',
    {
      schema: {
        tags: ['auth'],
        summary: 'Suscripción y uso del plan del tenant',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              planName: { type: 'string', nullable: true },
              maxBranches: { type: 'integer', nullable: true },
              maxUsers: { type: 'integer', nullable: true },
              currentBranches: { type: 'integer' },
              currentUsers: { type: 'integer' },
              subscriptionStatus: { type: 'string' },
              trialEndsAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const info = await tenantRepository.getSubscriptionInfo(request.user.tenant_id)
      if (!info) throw Errors.notFound('Subscription not found')
      return info
    },
  )

  // PATCH /auth/pin — ADMIN configura su PIN de autorización (4-6 dígitos)
  fastify.patch<{ Body: { pin: string } }>(
    '/pin',
    {
      schema: {
        tags: ['auth'],
        summary: 'Configurar PIN de administrador',
        body: {
          type: 'object',
          required: ['pin'],
          properties: {
            pin: { type: 'string', minLength: 4, maxLength: 6, pattern: '^\\d+$' },
          },
        },
        response: { 204: { type: 'null' } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const setPin = createSetPinUseCase({ userRepository })
      await setPin(request.user.user_id, request.body.pin)
      return reply.code(204).send()
    },
  )
}
