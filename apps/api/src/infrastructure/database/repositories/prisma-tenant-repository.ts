import type { PrismaClient } from '@prisma/client'
import type { ITenantRepository, TenantWithDetails, TenantStats, SubscriptionInfo } from '../../../domain/repositories/i-tenant-repository'
import type { Tenant } from '../../../domain/entities/tenant'
import { TenantStatus } from '../../../domain/entities/tenant'

export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly db: PrismaClient) {}

  async findBySlug(slug: string): Promise<Tenant | null> {
    const t = await this.db.tenant.findUnique({ where: { slug } })
    return t ? this.toEntity(t) : null
  }

  async findById(id: string): Promise<Tenant | null> {
    const t = await this.db.tenant.findUnique({ where: { id } })
    return t ? this.toEntity(t) : null
  }

  async findFirst(): Promise<Tenant | null> {
    const t = await this.db.tenant.findFirst()
    return t ? this.toEntity(t) : null
  }

  async create(data: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
    const t = await this.db.tenant.create({ data })
    return this.toEntity(t)
  }

  async count(): Promise<number> {
    return this.db.tenant.count()
  }

  async listWithDetails(): Promise<TenantWithDetails[]> {
    const tenants = await this.db.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { include: { plan: { select: { name: true } } } },
        _count: { select: { branches: true, users: true } },
      },
    })
    return tenants.map(this.toDetailEntity)
  }

  async getWithDetails(id: string): Promise<TenantWithDetails | null> {
    const t = await this.db.tenant.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: { select: { name: true } } } },
        _count: { select: { branches: true, users: true } },
      },
    })
    return t ? this.toDetailEntity(t) : null
  }

  async getSubscriptionInfo(tenantId: string): Promise<SubscriptionInfo | null> {
    const sub = await this.db.subscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { name: true, maxBranches: true, maxUsers: true } } },
    })
    if (!sub) return null
    const [currentBranches, currentUsers] = await Promise.all([
      this.db.branch.count({ where: { tenantId } }),
      this.db.user.count({ where: { tenantId } }),
    ])
    return {
      planName: sub.plan.name,
      maxBranches: sub.plan.maxBranches,
      maxUsers: sub.plan.maxUsers,
      currentBranches,
      currentUsers,
      subscriptionStatus: sub.status,
      trialEndsAt: sub.trialEndsAt,
    }
  }

  async updateStatus(id: string, status: TenantStatus): Promise<Tenant> {
    const t = await this.db.tenant.update({ where: { id }, data: { status } })
    return this.toEntity(t)
  }

  async getStats(): Promise<TenantStats> {
    const groups = await this.db.tenant.groupBy({
      by: ['status'],
      _count: { _all: true },
    })

    const byStatus = Object.fromEntries(
      Object.values(TenantStatus).map((s) => [s, 0]),
    ) as Record<TenantStatus, number>

    for (const g of groups) byStatus[g.status as TenantStatus] = g._count._all

    return { total: groups.reduce((acc, g) => acc + g._count._all, 0), byStatus }
  }

  private toEntity(raw: {
    id: string; name: string; slug: string; schema: string
    status: string; billingEmail: string | null; createdAt: Date
  }): Tenant {
    return {
      id: raw.id, name: raw.name, slug: raw.slug, schema: raw.schema,
      status: raw.status as TenantStatus, billingEmail: raw.billingEmail, createdAt: raw.createdAt,
    }
  }

  private toDetailEntity(raw: {
    id: string; name: string; slug: string; schema: string
    status: string; billingEmail: string | null; createdAt: Date
    subscription: { status: string; trialEndsAt: Date | null; plan: { name: string } | null } | null
    _count: { branches: number; users: number }
  }): TenantWithDetails {
    return {
      id: raw.id, name: raw.name, slug: raw.slug, schema: raw.schema,
      status: raw.status as TenantStatus, billingEmail: raw.billingEmail, createdAt: raw.createdAt,
      subscription: raw.subscription
        ? { planName: raw.subscription.plan?.name ?? null, status: raw.subscription.status, trialEndsAt: raw.subscription.trialEndsAt }
        : null,
      branchCount: raw._count.branches,
      userCount: raw._count.users,
    }
  }
}
