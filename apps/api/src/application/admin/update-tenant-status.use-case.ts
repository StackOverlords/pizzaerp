import type { ITenantRepository } from '../../domain/repositories/i-tenant-repository'
import type { Tenant, TenantStatus } from '../../domain/entities/tenant'
import { Errors } from '../../shared/errors/app-error'

export function createUpdateTenantStatusUseCase({ tenantRepository }: { tenantRepository: ITenantRepository }) {
  return async function updateTenantStatus(id: string, status: TenantStatus): Promise<Tenant> {
    const tenant = await tenantRepository.findById(id)
    if (!tenant) throw Errors.notFound('Tenant not found')

    return tenantRepository.updateStatus(id, status)
  }
}

export type UpdateTenantStatusUseCase = ReturnType<typeof createUpdateTenantStatusUseCase>
