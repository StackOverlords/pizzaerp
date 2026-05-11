import type { ITenantRepository } from '../../domain/repositories/i-tenant-repository'
import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { Tenant } from '../../domain/entities/tenant'
import type { User } from '../../domain/entities/user'
import { UserRole } from '../../domain/entities/user'
import { TenantStatus } from '../../domain/entities/tenant'
import type { TenantSchemaService } from '../../infrastructure/database/tenant-schema.service'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  tenantRepository: ITenantRepository
  userRepository: IUserRepository
  tenantSchemaService: TenantSchemaService
  hashPassword: (password: string) => Promise<string>
}

interface SetupData {
  tenantName: string
  slug: string
  username: string
  password: string
}

export function createSetupTenantUseCase({
  tenantRepository,
  userRepository,
  tenantSchemaService,
  hashPassword,
}: Dependencies) {
  return async function setupTenant(data: SetupData): Promise<{ tenant: Tenant; user: User }> {
    const count = await tenantRepository.count()
    if (count > 0) throw Errors.conflict('Setup already completed')

    const schema = `tenant_${data.slug.replace(/-/g, '_')}`

    const tenant = await tenantRepository.create({
      name: data.tenantName,
      slug: data.slug,
      schema,
      status: TenantStatus.ACTIVE,
      billingEmail: null,
    })

    await tenantSchemaService.provision(schema)

    const passwordHash = await hashPassword(data.password)
    const user = await userRepository.create({
      username: data.username,
      passwordHash,
      pinHash: null,
      role: UserRole.ADMIN,
      tenantId: tenant.id,
      branchId: null,
    })

    return { tenant, user }
  }
}

export type SetupTenantUseCase = ReturnType<typeof createSetupTenantUseCase>
