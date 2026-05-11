import type { ITenantRepository } from '../../domain/repositories/i-tenant-repository'
import type { TenantSchemaService } from '../../infrastructure/database/tenant-schema.service'
import { Errors } from '../../shared/errors/app-error'

export function createMigrateTenantSchemaUseCase({
  tenantRepository,
  tenantSchemaService,
}: {
  tenantRepository: ITenantRepository
  tenantSchemaService: TenantSchemaService
}) {
  return async function migrateTenantSchema(tenantId: string): Promise<void> {
    const tenant = await tenantRepository.findById(tenantId)
    if (!tenant) throw Errors.notFound('Tenant not found')

    await tenantSchemaService.provision(tenant.schema)
  }
}

export type MigrateTenantSchemaUseCase = ReturnType<typeof createMigrateTenantSchemaUseCase>
