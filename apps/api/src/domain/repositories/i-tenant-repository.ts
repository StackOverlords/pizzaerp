import type { Tenant, TenantStatus } from '../entities/tenant'

export interface TenantWithDetails extends Tenant {
  subscription: { planName: string | null; status: string; trialEndsAt: Date | null } | null
  branchCount: number
  userCount: number
}

export interface SubscriptionInfo {
  planName: string | null
  maxBranches: number | null
  maxUsers: number | null
  currentBranches: number
  currentUsers: number
  subscriptionStatus: string
  trialEndsAt: Date | null
}

export interface TenantStats {
  total: number
  byStatus: Record<TenantStatus, number>
}

export interface ITenantRepository {
  findBySlug(slug: string): Promise<Tenant | null>
  findById(id: string): Promise<Tenant | null>
  findFirst(): Promise<Tenant | null>
  create(data: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant>
  count(): Promise<number>
  getSubscriptionInfo(tenantId: string): Promise<SubscriptionInfo | null>
  // admin
  listWithDetails(): Promise<TenantWithDetails[]>
  getWithDetails(id: string): Promise<TenantWithDetails | null>
  updateStatus(id: string, status: TenantStatus): Promise<Tenant>
  getStats(): Promise<TenantStats>
}
