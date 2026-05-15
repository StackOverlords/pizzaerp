import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { UserRole } from '../../domain/entities/user'
import { resolveTenantSchema, tenantSchemaService } from '../../shared/container'
import { prisma } from '../../infrastructure/database/prisma'
import { PrismaTenantSettingsRepository } from '../../infrastructure/database/repositories/prisma-tenant-settings-repository'

const ALLOWED_KEYS = ['require_pin_for_cancel', 'require_pin_for_discount', 'blind_close_enabled'] as const
type AllowedKey = (typeof ALLOWED_KEYS)[number]

export async function tenantSettingsRoutes(fastify: FastifyInstance) {
  // GET /tenant-settings — devuelve la configuración del tenant
  fastify.get(
    '/',
    {
      schema: {
        tags: ['tenant-settings'],
        summary: 'Obtener configuración del tenant',
        response: {
          200: {
            type: 'object',
            properties: {
              requirePinForCancel:   { type: 'boolean' },
              requirePinForDiscount: { type: 'boolean' },
              blindCloseEnabled:     { type: 'boolean' },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request) => {
      const { tenant_id } = request.user
      const schema = await resolveTenantSchema(tenant_id)
      const repo = new PrismaTenantSettingsRepository(prisma, schema)
      const all = await repo.getAll()
      return {
        requirePinForCancel:   (all['require_pin_for_cancel']   ?? 'true') === 'true',
        requirePinForDiscount: (all['require_pin_for_discount'] ?? 'true') === 'true',
        blindCloseEnabled:     (all['blind_close_enabled']      ?? 'true') === 'true',
      }
    },
  )

  // PATCH /tenant-settings — actualiza una configuración (solo ADMIN)
  fastify.patch<{ Body: { key: AllowedKey; value: boolean } }>(
    '/',
    {
      schema: {
        tags: ['tenant-settings'],
        summary: 'Actualizar configuración del tenant (ADMIN)',
        body: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key:   { type: 'string', enum: ALLOWED_KEYS },
            value: { type: 'boolean' },
          },
        },
        response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const { tenant_id } = request.user
      const { key, value } = request.body
      const schema = await resolveTenantSchema(tenant_id)
      const repo = new PrismaTenantSettingsRepository(prisma, schema)
      await repo.set(key, value ? 'true' : 'false')
      return { ok: true }
    },
  )

  // POST /tenant-settings/migrate — re-provisiona el schema del tenant (ADMIN)
  fastify.post(
    '/migrate',
    {
      schema: {
        tags: ['tenant-settings'],
        summary: 'Re-provisionar schema del tenant (ADMIN)',
        description: 'Crea tablas faltantes y aplica migraciones idempotentes. Seguro de ejecutar múltiples veces.',
        response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const { tenant_id } = request.user
      const schema = await resolveTenantSchema(tenant_id)
      await tenantSchemaService.provision(schema)
      return { ok: true }
    },
  )
}
