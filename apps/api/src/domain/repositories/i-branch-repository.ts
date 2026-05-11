import type { Branch } from '../entities/branch'

export interface IBranchRepository {
  findAllByTenant(tenantId: string): Promise<Branch[]>
  findById(id: string, tenantId: string): Promise<Branch | null>
  create(data: { name: string; tenantId: string }): Promise<Branch>
  update(id: string, tenantId: string, name: string): Promise<Branch>
  delete(id: string, tenantId: string): Promise<void>
}
