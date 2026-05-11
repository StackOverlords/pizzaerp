import type { FastifyInstance } from 'fastify'
import {
  tenantRepository,
  createAdminTenantUseCase,
  updateTenantStatusUseCase,
  createTenantUserUseCase,
  migrateTenantSchemaUseCase,
} from '../../shared/container'
import { prisma } from '../../infrastructure/database/prisma'
import { adminAuth } from '../hooks/admin-auth.hook'
import { TenantStatus } from '../../domain/entities/tenant'
import { UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

// ─── Schemas reutilizables ────────────────────────────────────────────────────

const TENANT_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'UUID del tenant' },
    name: { type: 'string', description: 'Nombre del negocio' },
    slug: { type: 'string', description: 'Identificador único. El cliente lo usa para iniciar sesión en SaaS.' },
    schema: { type: 'string', description: 'Nombre del schema Postgres asignado' },
    status: { type: 'string', enum: Object.values(TenantStatus), description: 'Estado actual del tenant' },
    billingEmail: { type: 'string', nullable: true, description: 'Email de facturación (opcional)' },
    createdAt: { type: 'string', format: 'date-time' },
    subscription: {
      nullable: true,
      type: 'object',
      properties: {
        planName: { type: 'string', nullable: true, description: 'Nombre del plan asignado, null si no tiene' },
        status: { type: 'string', description: 'Estado de la suscripción' },
        trialEndsAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    branchCount: { type: 'integer', description: 'Número de sucursales del tenant' },
    userCount: { type: 'integer', description: 'Número de usuarios del tenant' },
  },
}

const TENANT_BASE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    schema: { type: 'string' },
    status: { type: 'string', enum: Object.values(TenantStatus) },
    billingEmail: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

const SECURITY = [{ adminApiKey: [] }]

// ─── Rutas ────────────────────────────────────────────────────────────────────

export async function adminRoutes(fastify: FastifyInstance) {
  // Todas las rutas de este plugin requieren X-Admin-Key
  fastify.addHook('preHandler', adminAuth)

  // ── GET /admin/stats ────────────────────────────────────────────────────────
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['admin'],
        summary: 'Estadísticas globales de tenants',
        description: 'Devuelve el total de tenants y el desglose por estado. Útil para el dashboard de operaciones.',
        security: SECURITY,
        response: {
          200: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total de tenants registrados' },
              byStatus: {
                type: 'object',
                description: 'Cantidad de tenants por cada estado',
                properties: {
                  ONBOARDING: { type: 'integer' },
                  ACTIVE: { type: 'integer' },
                  SUSPENDED: { type: 'integer' },
                  CANCELED: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async () => tenantRepository.getStats(),
  )

  // ── GET /admin/tenants ──────────────────────────────────────────────────────
  fastify.get(
    '/tenants',
    {
      schema: {
        tags: ['admin'],
        summary: 'Listar todos los tenants',
        description: 'Retorna todos los tenants con su suscripción, plan asignado, y conteo de sucursales y usuarios. Ordenados por fecha de creación descendente.',
        security: SECURITY,
        response: {
          200: {
            type: 'array',
            items: TENANT_SUMMARY_SCHEMA,
          },
        },
      },
    },
    async () => tenantRepository.listWithDetails(),
  )

  // ── GET /admin/tenants/:id ──────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/tenants/:id',
    {
      schema: {
        tags: ['admin'],
        summary: 'Detalle de un tenant',
        description: 'Retorna toda la información del tenant incluyendo suscripción, plan, sucursales y usuarios.',
        security: SECURITY,
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del tenant' } },
        },
        response: {
          200: TENANT_SUMMARY_SCHEMA,
          404: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request) => {
      const tenant = await tenantRepository.getWithDetails(request.params.id)
      if (!tenant) throw Errors.notFound('Tenant not found')
      return tenant
    },
  )

  // ── POST /admin/tenants ─────────────────────────────────────────────────────
  fastify.post<{ Body: { tenantName: string; slug: string; billingEmail?: string } }>(
    '/tenants',
    {
      schema: {
        tags: ['admin'],
        summary: 'Crear nuevo tenant',
        description: 'Crea el registro del tenant y provisiona su schema de base de datos. El tenant queda en estado ONBOARDING hasta que se activa. No crea usuarios — usar POST /admin/tenants/:id/users para el primer admin.',
        security: SECURITY,
        body: {
          type: 'object',
          required: ['tenantName', 'slug'],
          properties: {
            tenantName: { type: 'string', minLength: 1, example: 'La Pizza Feliz', description: 'Nombre del negocio (visible en el sistema)' },
            slug: { type: 'string', minLength: 2, maxLength: 60, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', example: 'pizza-feliz', description: 'Identificador único del tenant. Solo minúsculas, números y guiones. No se puede cambiar después.' },
            billingEmail: { type: 'string', format: 'email', example: 'due@pizza.com', description: 'Email de contacto para facturación (opcional)' },
          },
        },
        response: {
          201: TENANT_BASE_SCHEMA,
          409: { type: 'object', properties: { message: { type: 'string', description: 'El slug ya está en uso' } } },
        },
      },
    },
    async (request, reply) => {
      const tenant = await createAdminTenantUseCase(request.body)
      return reply.code(201).send(tenant)
    },
  )

  // ── PATCH /admin/tenants/:id/status ────────────────────────────────────────
  fastify.patch<{ Params: { id: string }; Body: { status: TenantStatus } }>(
    '/tenants/:id/status',
    {
      schema: {
        tags: ['admin'],
        summary: 'Cambiar estado del tenant',
        description: `Cambia el estado del tenant. Transiciones posibles:
- **ONBOARDING → ACTIVE**: activar después de completar la configuración inicial
- **ACTIVE → SUSPENDED**: suspender por falta de pago u otro motivo
- **SUSPENDED → ACTIVE**: reactivar
- **Cualquier estado → CANCELED**: cancelar definitivamente (no reversible en práctica)`,
        security: SECURITY,
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del tenant' } },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: Object.values(TenantStatus),
              example: 'ACTIVE',
              description: 'Nuevo estado del tenant',
            },
          },
        },
        response: {
          200: TENANT_BASE_SCHEMA,
          404: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request) => updateTenantStatusUseCase(request.params.id, request.body.status),
  )

  // ── POST /admin/tenants/:id/users ───────────────────────────────────────────
  fastify.post<{ Params: { id: string }; Body: { username: string; password: string; role?: string } }>(
    '/tenants/:id/users',
    {
      schema: {
        tags: ['admin'],
        summary: 'Crear usuario en un tenant',
        description: 'Crea un usuario dentro del tenant especificado. Usar para el primer admin del cliente después de crear el tenant. El usuario queda sin sucursal asignada (branchId null) — el propio admin puede asignarlo después.',
        security: SECURITY,
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del tenant' } },
        },
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, example: 'admin', description: 'Nombre de usuario para iniciar sesión' },
            password: { type: 'string', minLength: 6, example: 'secreto123', description: 'Contraseña inicial. El usuario puede cambiarla después.' },
            role: {
              type: 'string',
              enum: Object.values(UserRole),
              example: 'ADMIN',
              description: 'Rol del usuario. Por defecto ADMIN si se omite.',
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              role: { type: 'string' },
              tenantId: { type: 'string' },
              branchId: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          404: { type: 'object', properties: { message: { type: 'string', description: 'Tenant no encontrado' } } },
          409: { type: 'object', properties: { message: { type: 'string', description: 'El username ya existe en ese tenant' } } },
        },
      },
    },
    async (request, reply) => {
      const user = await createTenantUserUseCase({
        tenantId: request.params.id,
        username: request.body.username,
        password: request.body.password,
        role: request.body.role as UserRole | undefined,
      })
      return reply.code(201).send(user)
    },
  )

  // ── Schemas de Plan ─────────────────────────────────────────────────────────

  const PLAN_SCHEMA = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string', description: 'Nombre del plan' },
      maxBranches: { type: 'integer', nullable: true, description: 'Máx. sucursales. null = ilimitado' },
      maxUsers: { type: 'integer', nullable: true, description: 'Máx. usuarios. null = ilimitado' },
      features: { type: 'array', items: { type: 'string' }, description: 'Lista de features habilitadas' },
      priceMonthly: { type: 'number', nullable: true, description: 'Precio mensual. null = licencia perpetua' },
      createdAt: { type: 'string', format: 'date-time' },
      subscriptionCount: { type: 'integer', description: 'Cantidad de tenants usando este plan' },
    },
  }

  const PLAN_BODY = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, example: 'Pro', description: 'Nombre único del plan' },
      maxBranches: { type: 'integer', minimum: 1, nullable: true, example: 5, description: 'Máx. sucursales permitidas. Omitir o null para ilimitado.' },
      maxUsers: { type: 'integer', minimum: 1, nullable: true, example: 20, description: 'Máx. usuarios permitidos. Omitir o null para ilimitado.' },
      features: {
        type: 'array',
        items: { type: 'string' },
        example: ['inventory', 'reports'],
        description: 'Features habilitadas para este plan. Ej: inventory, reports, supply-transfers.',
      },
      priceMonthly: { type: 'number', minimum: 0, nullable: true, example: 49.99, description: 'Precio mensual. Omitir o null para licencia perpetua.' },
    },
  }

  // ── GET /admin/plans ────────────────────────────────────────────────────────
  fastify.get(
    '/plans',
    {
      schema: {
        tags: ['admin'],
        summary: 'Listar planes',
        description: 'Devuelve todos los planes con la cantidad de tenants activos en cada uno. Usar los IDs para asignar suscripciones.',
        security: SECURITY,
        response: { 200: { type: 'array', items: PLAN_SCHEMA } },
      },
    },
    async () => {
      const plans = await prisma.plan.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { subscriptions: true } } },
      })
      return plans.map(({ _count, ...p }) => ({ ...p, subscriptionCount: _count.subscriptions }))
    },
  )

  // ── GET /admin/plans/:id ────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/plans/:id',
    {
      schema: {
        tags: ['admin'],
        summary: 'Detalle de un plan',
        security: SECURITY,
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del plan' } },
        },
        response: {
          200: PLAN_SCHEMA,
          404: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request) => {
      const plan = await prisma.plan.findUnique({
        where: { id: request.params.id },
        include: { _count: { select: { subscriptions: true } } },
      })
      if (!plan) throw Errors.notFound('Plan not found')
      const { _count, ...rest } = plan
      return { ...rest, subscriptionCount: _count.subscriptions }
    },
  )

  // ── POST /admin/plans ───────────────────────────────────────────────────────
  fastify.post<{ Body: { name: string; maxBranches?: number | null; maxUsers?: number | null; features?: string[]; priceMonthly?: number | null } }>(
    '/plans',
    {
      schema: {
        tags: ['admin'],
        summary: 'Crear plan',
        description: 'Crea un nuevo plan de suscripción. Una vez creado, se puede asignar a tenants via POST /admin/tenants/:id/subscription.',
        security: SECURITY,
        body: { ...PLAN_BODY, required: ['name'] },
        response: {
          201: PLAN_SCHEMA,
          409: { type: 'object', properties: { message: { type: 'string', description: 'Ya existe un plan con ese nombre' } } },
        },
      },
    },
    async (request, reply) => {
      const existing = await prisma.plan.findUnique({ where: { name: request.body.name } })
      if (existing) throw Errors.conflict(`Plan '${request.body.name}' already exists`)

      const plan = await prisma.plan.create({
        data: {
          name: request.body.name,
          maxBranches: request.body.maxBranches ?? null,
          maxUsers: request.body.maxUsers ?? null,
          features: request.body.features ?? [],
          priceMonthly: request.body.priceMonthly ?? null,
        },
        include: { _count: { select: { subscriptions: true } } },
      })
      const { _count, ...rest } = plan
      return reply.code(201).send({ ...rest, subscriptionCount: _count.subscriptions })
    },
  )

  // ── PATCH /admin/plans/:id ──────────────────────────────────────────────────
  fastify.patch<{ Params: { id: string }; Body: { name?: string; maxBranches?: number | null; maxUsers?: number | null; features?: string[]; priceMonthly?: number | null } }>(
    '/plans/:id',
    {
      schema: {
        tags: ['admin'],
        summary: 'Actualizar plan',
        description: 'Actualiza los campos del plan. Solo enviar los campos que quierás cambiar — los demás se mantienen. Nota: cambiar los límites de un plan afecta a todos los tenants que lo tengan asignado.',
        security: SECURITY,
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del plan' } },
        },
        body: PLAN_BODY,
        response: {
          200: PLAN_SCHEMA,
          404: { type: 'object', properties: { message: { type: 'string' } } },
          409: { type: 'object', properties: { message: { type: 'string', description: 'El nuevo nombre ya está en uso por otro plan' } } },
        },
      },
    },
    async (request) => {
      const plan = await prisma.plan.findUnique({ where: { id: request.params.id } })
      if (!plan) throw Errors.notFound('Plan not found')

      const updated = await prisma.plan.update({
        where: { id: request.params.id },
        data: {
          ...(request.body.name !== undefined && { name: request.body.name }),
          ...(request.body.maxBranches !== undefined && { maxBranches: request.body.maxBranches }),
          ...(request.body.maxUsers !== undefined && { maxUsers: request.body.maxUsers }),
          ...(request.body.features !== undefined && { features: request.body.features }),
          ...(request.body.priceMonthly !== undefined && { priceMonthly: request.body.priceMonthly }),
        },
        include: { _count: { select: { subscriptions: true } } },
      })
      const { _count, ...rest } = updated
      return { ...rest, subscriptionCount: _count.subscriptions }
    },
  )

  // ── DELETE /admin/plans/:id ─────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/plans/:id',
    {
      schema: {
        tags: ['admin'],
        summary: 'Eliminar plan',
        description: 'Elimina el plan. **No se puede eliminar si hay tenants con suscripciones activas en este plan** — primero reasignar o cancelar esas suscripciones.',
        security: SECURITY,
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del plan a eliminar' } },
        },
        response: {
          204: { type: 'null', description: 'Plan eliminado' },
          404: { type: 'object', properties: { message: { type: 'string' } } },
          409: { type: 'object', properties: { message: { type: 'string', description: 'El plan tiene tenants activos y no puede eliminarse' } } },
        },
      },
    },
    async (request, reply) => {
      const plan = await prisma.plan.findUnique({
        where: { id: request.params.id },
        include: { _count: { select: { subscriptions: true } } },
      })
      if (!plan) throw Errors.notFound('Plan not found')
      if (plan._count.subscriptions > 0) throw Errors.conflict(`Plan has ${plan._count.subscriptions} active subscription(s). Reassign tenants before deleting.`)

      await prisma.plan.delete({ where: { id: request.params.id } })
      return reply.code(204).send()
    },
  )

  // ── POST /admin/tenants/:id/subscription ────────────────────────────────────
  fastify.post<{ Params: { id: string }; Body: { planId: string; status?: string } }>(
    '/tenants/:id/subscription',
    {
      schema: {
        tags: ['admin'],
        summary: 'Asignar o actualizar suscripción de un tenant',
        description: 'Crea o actualiza la suscripción del tenant con el plan indicado. Si el tenant ya tenía una suscripción, la reemplaza. Usar GET /admin/plans para obtener los IDs de planes disponibles.',
        security: SECURITY,
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del tenant' } },
        },
        body: {
          type: 'object',
          required: ['planId'],
          properties: {
            planId: { type: 'string', description: 'ID del plan a asignar. Obtener de GET /admin/plans' },
            status: {
              type: 'string',
              enum: ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELED'],
              example: 'ACTIVE',
              description: 'Estado de la suscripción. Por defecto ACTIVE si se omite.',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              tenantId: { type: 'string' },
              planId: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          404: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request) => {
      const tenant = await tenantRepository.findById(request.params.id)
      if (!tenant) throw Errors.notFound('Tenant not found')

      const plan = await prisma.plan.findUnique({ where: { id: request.body.planId } })
      if (!plan) throw Errors.notFound('Plan not found')

      return prisma.subscription.upsert({
        where: { tenantId: request.params.id },
        update: { planId: request.body.planId, status: (request.body.status ?? 'ACTIVE') as never },
        create: { tenantId: request.params.id, planId: request.body.planId, status: (request.body.status ?? 'ACTIVE') as never },
      })
    },
  )

  // ── POST /admin/tenants/:id/migrate ────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/tenants/:id/migrate',
    {
      schema: {
        tags: ['admin'],
        summary: 'Ejecutar migraciones de schema en un tenant',
        description: 'Re-ejecuta el DDL completo del tenant (CREATE TABLE IF NOT EXISTS, ALTER TABLE IF EXISTS). Es idempotente: no destruye datos existentes, solo agrega tablas o columnas que faltan. Usar después de deployar una nueva versión de la API que agrega nuevas tablas.',
        security: SECURITY,
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'ID del tenant' } },
        },
        response: {
          204: { type: 'null', description: 'Migración ejecutada exitosamente' },
          404: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      await migrateTenantSchemaUseCase(request.params.id)
      return reply.code(204).send()
    },
  )
}
