import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaDoughDayClosureRepository } from '../../infrastructure/database/repositories/prisma-dough-day-closure-repository'
import { createCloseDoughDayUseCase } from '../../application/dough-closings/close-dough-day.use-case'
import { UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

interface CloseBody {
  closureDate: string
  doughType: string
  soldCount: number
  actualRemaining: number
  notes?: string | null
}

interface ListQuery {
  from?: string
  to?: string
}

const closureSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    branchId: { type: 'string' },
    closureDate: { type: 'string' },
    doughType: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
    initialCount: { type: 'number' },
    soldCount: { type: 'number' },
    wastageCount: { type: 'number' },
    theoreticalRemaining: { type: 'number' },
    actualRemaining: { type: 'number' },
    difference: { type: 'number' },
    notes: { type: ['string', 'null'] },
    closedByUserId: { type: 'string' },
    closedAt: { type: 'string', format: 'date-time' },
  },
}

const summaryItemSchema = {
  type: 'object',
  properties: {
    doughType: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
    initialCount: { type: 'number' },
    wastageCount: { type: 'number' },
  },
}

export async function doughClosingRoutes(fastify: FastifyInstance) {
  // GET /dough-closings/summary — preview de valores calculados antes de cerrar (ADMIN)
  fastify.get<{ Querystring: { date: string } }>(
    '/summary',
    {
      schema: {
        tags: ['dough-closings'],
        summary: 'Preview del cierre de masas: valores calculados automáticamente',
        querystring: {
          type: 'object',
          required: ['date'],
          properties: { date: { type: 'string', format: 'date' } },
        },
        response: { 200: { type: 'array', items: summaryItemSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const { tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDoughDayClosureRepository(db, schema)
        return repo.getSummary(branch_id, new Date(request.query.date))
      } finally {
        await db.$disconnect()
      }
    },
  )

  // POST /dough-closings — registrar cierre diario de masas (ADMIN)
  fastify.post<{ Body: CloseBody }>(
    '/',
    {
      schema: {
        tags: ['dough-closings'],
        summary: 'Registrar cierre diario de control de masas',
        body: {
          type: 'object',
          required: ['closureDate', 'doughType', 'soldCount', 'actualRemaining'],
          properties: {
            closureDate: { type: 'string', format: 'date' },
            doughType: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
            soldCount: { type: 'integer', minimum: 0 },
            actualRemaining: { type: 'integer', minimum: 0 },
            notes: { type: 'string' },
          },
        },
        response: { 201: closureSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const { user_id, tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDoughDayClosureRepository(db, schema)
        const closeDoughDay = createCloseDoughDayUseCase({ doughDayClosureRepository: repo })
        const closure = await closeDoughDay({
          branchId: branch_id,
          closedByUserId: user_id,
          closureDate: request.body.closureDate,
          doughType: request.body.doughType,
          soldCount: request.body.soldCount,
          actualRemaining: request.body.actualRemaining,
          notes: request.body.notes,
        })
        return reply.code(201).send(closure)
      } finally {
        await db.$disconnect()
      }
    },
  )

  // GET /dough-closings — historial de cierres (ADMIN)
  fastify.get<{ Querystring: ListQuery }>(
    '/',
    {
      schema: {
        tags: ['dough-closings'],
        summary: 'Historial de cierres de control de masas',
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
        response: { 200: { type: 'array', items: closureSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const { tenant_id, branch_id } = request.user
      if (!branch_id) throw Errors.badRequest('El usuario no tiene sucursal asignada')

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaDoughDayClosureRepository(db, schema)
        return repo.list(
          branch_id,
          request.query.from ? new Date(request.query.from) : undefined,
          request.query.to ? new Date(request.query.to) : undefined,
        )
      } finally {
        await db.$disconnect()
      }
    },
  )
}
