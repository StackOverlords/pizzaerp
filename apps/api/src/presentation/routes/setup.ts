import type { FastifyInstance } from 'fastify'
import { setupTenantUseCase, tenantRepository } from '../../shared/container'
import type { JwtPayload } from '../plugins/jwt.plugin'
import { UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

interface SetupBody {
  tenantName: string
  slug: string
  username: string
  password: string
}

export async function setupRoutes(fastify: FastifyInstance) {
  // GET /setup/status — el frontend consulta esto al arrancar para saber si redirigir al wizard
  fastify.get(
    '/status',
    {
      schema: {
        tags: ['setup'],
        summary: 'Estado de configuración inicial',
        response: {
          200: {
            type: 'object',
            properties: { configured: { type: 'boolean' } },
          },
        },
      },
    },
    async () => {
      const count = await tenantRepository.count()
      return { configured: count > 0 }
    },
  )

  // POST /setup — crea el primer tenant + usuario ADMIN (solo funciona en instalación limpia)
  fastify.post<{ Body: SetupBody }>(
    '/',
    {
      schema: {
        tags: ['setup'],
        summary: 'Configuración inicial (Client-VPS)',
        description: 'Solo disponible en modo Client-VPS (cuando SUPER_ADMIN_KEY no está configurado).',
        body: {
          type: 'object',
          required: ['tenantName', 'slug', 'username', 'password'],
          properties: {
            tenantName: { type: 'string', minLength: 1, example: 'MaxPizza Central' },
            slug: { type: 'string', minLength: 2, maxLength: 60, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', example: 'maxpizza' },
            username: { type: 'string', minLength: 3, example: 'admin' },
            password: { type: 'string', minLength: 6, example: 'secreto123' },
          },
        },
        response: {
          201: {
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
      if (process.env.SUPER_ADMIN_KEY) {
        throw Errors.forbidden('Setup endpoint is disabled in SaaS mode. Use the admin API.')
      }
      const { tenant, user } = await setupTenantUseCase(request.body)

      const payload: JwtPayload = {
        user_id: user.id,
        tenant_id: tenant.id,
        branch_id: user.branchId,
        role: UserRole.ADMIN,
        type: 'access',
      }

      const access_token = fastify.jwt.sign(payload)
      const refresh_token = fastify.jwt.sign(
        { ...payload, type: 'refresh' } satisfies JwtPayload,
        { expiresIn: '7d' },
      )

      return reply.code(201).send({ access_token, refresh_token })
    },
  )
}
