import type { FastifyInstance } from 'fastify'
import { authenticate } from '../hooks/authenticate.hook'
import { authorize } from '../hooks/authorize.hook'
import { resolveTenantSchema } from '../../shared/container'
import { createTenantClient } from '../../infrastructure/database/tenant-client.factory'
import { PrismaSupplyDayClosureRepository } from '../../infrastructure/database/repositories/prisma-supply-day-closure-repository'
import { createGetSupplyTransferReportUseCase } from '../../application/reports/get-supply-transfer-report.use-case'
import { UserRole } from '../../domain/entities/user'

interface ReportQuery {
  branchId?: string
  from?: string
  to?: string
}

const doughTypeReportSchema = {
  type: 'object',
  properties: {
    supplyType: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE'] },
    initialCount: { type: 'number' },
    soldCount: { type: 'number' },
    wastageCount: { type: 'number' },
    theoreticalRemaining: { type: 'number' },
    actualRemaining: { type: 'number' },
    difference: { type: 'number' },
    status: { type: 'string', enum: ['GREEN', 'YELLOW', 'RED'] },
  },
}

const reportSchema = {
  type: 'object',
  properties: {
    branchId: { type: 'string' },
    date: { type: 'string' },
    supplyTypes: { type: 'array', items: doughTypeReportSchema },
    overallStatus: { type: 'string', enum: ['GREEN', 'YELLOW', 'RED'] },
  },
}

export async function reportRoutes(fastify: FastifyInstance) {
  // GET /reports/supply-transfers — reporte de masas por sucursal y día (solo ADMIN)
  fastify.get<{ Querystring: ReportQuery }>(
    '/supply-transfers',
    {
      schema: {
        tags: ['reports'],
        summary: 'Reporte remoto de transferencias de masas por sucursal',
        querystring: {
          type: 'object',
          properties: {
            branchId: { type: 'string' },
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
        response: { 200: { type: 'array', items: reportSchema } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authenticate, authorize([UserRole.ADMIN])],
    },
    async (request) => {
      const { tenant_id } = request.user

      const schema = await resolveTenantSchema(tenant_id)
      const db = createTenantClient(schema)
      try {
        const repo = new PrismaSupplyDayClosureRepository(db, schema)
        const getReport = createGetSupplyTransferReportUseCase({ supplyDayClosureRepository: repo })
        return getReport({
          branchId: request.query.branchId,
          from: request.query.from ? new Date(request.query.from) : undefined,
          to: request.query.to ? new Date(request.query.to) : undefined,
        })
      } finally {
        await db.$disconnect()
      }
    },
  )
}
