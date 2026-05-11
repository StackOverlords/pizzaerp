import type { PrismaClient } from '@prisma/client'
import type { IBranchRepository } from '../../../domain/repositories/i-branch-repository'
import type { Branch } from '../../../domain/entities/branch'

export class PrismaBranchRepository implements IBranchRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAllByTenant(tenantId: string): Promise<Branch[]> {
    const branches = await this.db.branch.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
    return branches.map(b => this.toEntity(b))
  }

  async findById(id: string, tenantId: string): Promise<Branch | null> {
    const branch = await this.db.branch.findFirst({ where: { id, tenantId } })
    return branch ? this.toEntity(branch) : null
  }

  async create(data: { name: string; tenantId: string }): Promise<Branch> {
    const branch = await this.db.branch.create({ data })
    return this.toEntity(branch)
  }

  async update(id: string, tenantId: string, name: string): Promise<Branch> {
    const branch = await this.db.branch.update({
      where: { id },
      data: { name },
    })
    return this.toEntity(branch)
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.db.branch.deleteMany({ where: { id, tenantId } })
  }

  private toEntity(raw: { id: string; name: string; tenantId: string }): Branch {
    return {
      id: raw.id,
      name: raw.name,
      tenantId: raw.tenantId,
    }
  }
}
