import type { PrismaClient } from '@prisma/client'
import { Errors } from '../../shared/errors/app-error'

async function getTenantLimits(db: PrismaClient, tenantId: string) {
  const sub = await db.subscription.findUnique({
    where: { tenantId },
    include: { plan: { select: { maxBranches: true, maxUsers: true } } },
  })
  return sub?.plan ?? null
}

export async function assertBranchLimit(db: PrismaClient, tenantId: string): Promise<void> {
  const limits = await getTenantLimits(db, tenantId)
  if (!limits || limits.maxBranches === null) return

  const count = await db.branch.count({ where: { tenantId } })
  if (count >= limits.maxBranches) {
    throw Errors.conflict(`Plan limit reached: maximum ${limits.maxBranches} branch(es) allowed. Upgrade your plan to add more.`)
  }
}

export async function assertUserLimit(db: PrismaClient, tenantId: string): Promise<void> {
  const limits = await getTenantLimits(db, tenantId)
  if (!limits || limits.maxUsers === null) return

  const count = await db.user.count({ where: { tenantId } })
  if (count >= limits.maxUsers) {
    throw Errors.conflict(`Plan limit reached: maximum ${limits.maxUsers} user(s) allowed. Upgrade your plan to add more.`)
  }
}
