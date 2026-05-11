import type { ITenantRepository } from '../../domain/repositories/i-tenant-repository'
import type { Tenant } from '../../domain/entities/tenant'
import { TenantStatus } from '../../domain/entities/tenant'
import type { TenantSchemaService } from '../../infrastructure/database/tenant-schema.service'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  tenantRepository: ITenantRepository
  tenantSchemaService: TenantSchemaService
}

interface CreateAdminTenantData {
  tenantName: string
  slug: string
  billingEmail?: string
}

export function createCreateAdminTenantUseCase({ tenantRepository, tenantSchemaService }: Dependencies) {
  return async function createAdminTenant(data: CreateAdminTenantData): Promise<Tenant> {
    const existing = await tenantRepository.findBySlug(data.slug)
    if (existing) throw Errors.conflict(`Slug '${data.slug}' already taken`)

    const schema = `tenant_${data.slug.replace(/-/g, '_')}`

    const tenant = await tenantRepository.create({
      name: data.tenantName,
      slug: data.slug,
      schema,
      status: TenantStatus.ONBOARDING,
      billingEmail: data.billingEmail ?? null,
    })

    await tenantSchemaService.provision(schema)

    return tenant
  }
}

export type CreateAdminTenantUseCase = ReturnType<typeof createCreateAdminTenantUseCase>
