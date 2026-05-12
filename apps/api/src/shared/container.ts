import { prisma } from '../infrastructure/database/prisma'
import { PrismaUserRepository } from '../infrastructure/database/repositories/prisma-user-repository'
import { PrismaTenantRepository } from '../infrastructure/database/repositories/prisma-tenant-repository'
import { PrismaBranchRepository } from '../infrastructure/database/repositories/prisma-branch-repository'
import { TenantSchemaService } from '../infrastructure/database/tenant-schema.service'
import { bcryptService } from '../infrastructure/auth/bcrypt.service'
import { createGetAppConfigUseCase } from '../application/config/get-app-config.use-case'
import { createLoginUseCase } from '../application/auth/login.use-case'
import { createSetupTenantUseCase } from '../application/tenants/setup-tenant.use-case'
import { createCreateAdminTenantUseCase } from '../application/admin/create-admin-tenant.use-case'
import { createUpdateTenantStatusUseCase } from '../application/admin/update-tenant-status.use-case'
import { createCreateTenantUserUseCase } from '../application/admin/create-tenant-user.use-case'
import { createMigrateTenantSchemaUseCase } from '../application/admin/migrate-tenant-schema.use-case'
import { createListBranchesUseCase } from '../application/branches/list-branches.use-case'
import { createCreateBranchUseCase } from '../application/branches/create-branch.use-case'
import { createUpdateBranchUseCase } from '../application/branches/update-branch.use-case'
import { createDeleteBranchUseCase } from '../application/branches/delete-branch.use-case'
import { Errors } from './errors/app-error'

// Repositories
export const userRepository = new PrismaUserRepository(prisma)
export const tenantRepository = new PrismaTenantRepository(prisma)
export const branchRepository = new PrismaBranchRepository(prisma)

// Services
export const tenantSchemaService = new TenantSchemaService(prisma)

// Use cases
export const getAppConfigUseCase = createGetAppConfigUseCase({
  tenantRepository,
  getMode: () => (process.env.SUPER_ADMIN_KEY ? 'saas' : 'client-vps'),
})

export const loginUseCase = createLoginUseCase({
  userRepository,
  comparePassword: bcryptService.compare,
})

export const setupTenantUseCase = createSetupTenantUseCase({
  tenantRepository,
  userRepository,
  tenantSchemaService,
  hashPassword: bcryptService.hash,
})

// Admin use cases
export const createAdminTenantUseCase = createCreateAdminTenantUseCase({ tenantRepository, tenantSchemaService })
export const updateTenantStatusUseCase = createUpdateTenantStatusUseCase({ tenantRepository })
export const createTenantUserUseCase = createCreateTenantUserUseCase({ tenantRepository, userRepository, hashPassword: bcryptService.hash })
export const migrateTenantSchemaUseCase = createMigrateTenantSchemaUseCase({ tenantRepository, tenantSchemaService })

// Branch use cases
export const listBranchesUseCase = createListBranchesUseCase({ branchRepository })
export const createBranchUseCase = createCreateBranchUseCase({ branchRepository, db: prisma })
export const updateBranchUseCase = createUpdateBranchUseCase({ branchRepository })
export const deleteBranchUseCase = createDeleteBranchUseCase({ branchRepository })

// Resolves the tenant schema name from a tenant_id (JWT claim).
// Called per-request for tenant-scoped routes.
export async function resolveTenantSchema(tenantId: string): Promise<string> {
  const tenant = await tenantRepository.findById(tenantId)
  if (!tenant) throw Errors.notFound('Tenant not found')
  return tenant.schema
}
