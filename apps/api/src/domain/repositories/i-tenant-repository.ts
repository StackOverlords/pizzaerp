import type { Tenant } from '../entities/tenant'

export interface ITenantRepository {
  findBySlug(slug: string): Promise<Tenant | null>
  findById(id: string): Promise<Tenant | null>
  create(data: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant>
}
