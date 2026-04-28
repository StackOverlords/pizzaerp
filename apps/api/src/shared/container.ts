import { prisma } from '../infrastructure/database/prisma'
import { PrismaUserRepository } from '../infrastructure/database/repositories/prisma-user-repository'
import { bcryptService } from '../infrastructure/auth/bcrypt.service'
import { createLoginUseCase } from '../application/auth/login.use-case'
import { Errors } from './errors/app-error'

// Repositories
export const userRepository = new PrismaUserRepository(prisma)

// Use cases
export const loginUseCase = createLoginUseCase({
  userRepository,
  comparePassword: bcryptService.compare,
})

// Resolves the tenant schema name from a tenant_id (JWT claim).
// Called per-request for tenant-scoped routes.
export async function resolveTenantSchema(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { schema: true } })
  if (!tenant) throw Errors.notFound('Tenant not found')
  return tenant.schema
}
